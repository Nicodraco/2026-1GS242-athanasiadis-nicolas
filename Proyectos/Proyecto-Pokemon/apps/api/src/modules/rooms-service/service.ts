import type { Db } from "mongodb";

import { getDb } from "../../lib/mongodb";
import {
  DEFAULT_ROOM_SETTINGS,
  getRoomsCollection,
  isRoomJoinable,
  type RoomDocument,
  type RoomSettings,
} from "./room.model";
import { RoomServiceError } from "./errors";

export type CreateRoomInput = {
  playerId: string;
  displayName: string;
  settings?: Partial<RoomSettings>;
};

export type JoinRoomInput = {
  code: string;
  playerId: string;
  displayName: string;
};

export type SetPlayerReadyInput = {
  code: string;
  playerId: string;
  isReady: boolean;
};

export type SetTeamSelectionInput = {
  code: string;
  playerId: string;
  pokemonIds: number[];
};

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 6;

const getDbOrDefault = async (dbArg?: Db): Promise<Db> => {
  if (dbArg) {
    return dbArg;
  }

  return getDb();
};

const normalizeRoomCode = (code: string): string => {
  return code.trim().toUpperCase();
};

const generateRoomCode = (): string => {
  let output = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    const randomIndex = Math.floor(Math.random() * ROOM_CODE_ALPHABET.length);
    output += ROOM_CODE_ALPHABET[randomIndex];
  }

  return output;
};

const sanitizeDisplayName = (displayName: string): string => {
  const value = displayName.trim();
  if (!value) {
    throw new RoomServiceError("INVALID_ACTION", "displayName cannot be empty.");
  }

  return value.slice(0, 24);
};

const sanitizePlayerId = (playerId: string): string => {
  const value = playerId.trim();
  if (!value) {
    throw new RoomServiceError("INVALID_ACTION", "playerId cannot be empty.");
  }

  return value;
};

const buildRoomSettings = (settings?: Partial<RoomSettings>): RoomSettings => {
  const maxPlayers = settings?.maxPlayers ?? DEFAULT_ROOM_SETTINGS.maxPlayers;
  const maxTeamSize = settings?.maxTeamSize ?? DEFAULT_ROOM_SETTINGS.maxTeamSize;

  if (!Number.isInteger(maxPlayers) || maxPlayers !== 2) {
    throw new RoomServiceError("INVALID_ACTION", "maxPlayers must be 2 for MVP.");
  }

  if (!Number.isInteger(maxTeamSize) || maxTeamSize <= 0 || maxTeamSize > 6) {
    throw new RoomServiceError("INVALID_ACTION", "maxTeamSize must be between 1 and 6.");
  }

  return { maxPlayers, maxTeamSize };
};

const assertPlayerNotInRoom = (room: RoomDocument, playerId: string): void => {
  if (room.players.some((player) => player.playerId === playerId)) {
    throw new RoomServiceError("INVALID_ACTION", "Player is already in this room.");
  }
};

const assertRoomHasPlayer = (room: RoomDocument, playerId: string): void => {
  if (!room.players.some((player) => player.playerId === playerId)) {
    throw new RoomServiceError("PLAYER_NOT_IN_ROOM", "Player is not in this room.");
  }
};

const sanitizeTeamSelection = (pokemonIds: number[]): number[] => {
  if (!Array.isArray(pokemonIds)) {
    throw new RoomServiceError("INVALID_ACTION", "pokemonIds must be an array.");
  }

  if (pokemonIds.length > 6) {
    throw new RoomServiceError("INVALID_ACTION", "Team selection cannot exceed 6 pokemon.");
  }

  if (!pokemonIds.every((id) => Number.isInteger(id) && id > 0)) {
    throw new RoomServiceError("INVALID_ACTION", "pokemonIds must contain positive integers.");
  }

  const unique = [...new Set(pokemonIds)];
  if (unique.length !== pokemonIds.length) {
    throw new RoomServiceError("INVALID_ACTION", "Team selection cannot contain duplicate pokemon.");
  }

  return unique;
};

const getRoomOrThrow = async (code: string, db: Db): Promise<RoomDocument> => {
  const rooms = getRoomsCollection(db);
  const normalizedCode = normalizeRoomCode(code);
  const room = await rooms.findOne({ code: normalizedCode });
  if (!room) {
    throw new RoomServiceError("ROOM_NOT_FOUND", `Room ${normalizedCode} was not found.`);
  }

  return room;
};

export const createRoom = async (input: CreateRoomInput, dbArg?: Db): Promise<RoomDocument> => {
  const db = await getDbOrDefault(dbArg);
  const rooms = getRoomsCollection(db);
  const playerId = sanitizePlayerId(input.playerId);
  const displayName = sanitizeDisplayName(input.displayName);
  const settings = buildRoomSettings(input.settings);
  const now = new Date();

  let createdRoom: RoomDocument | null = null;
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const code = generateRoomCode();
    const existingRoom = await rooms.findOne({ code });
    if (existingRoom) {
      continue;
    }

    const room: RoomDocument = {
      code,
      status: "waiting",
      players: [{ playerId, displayName, isReady: false, joinedAt: now }],
      teamSelections: {
        [playerId]: [],
      },
      battleId: null,
      settings,
      createdAt: now,
      updatedAt: now,
    };

    await rooms.insertOne(room);
    createdRoom = room;
    break;
  }

  if (!createdRoom) {
    throw new RoomServiceError("INVALID_ACTION", "Could not generate a unique room code.");
  }

  return createdRoom;
};

export const joinRoom = async (input: JoinRoomInput, dbArg?: Db): Promise<RoomDocument> => {
  const db = await getDbOrDefault(dbArg);
  const rooms = getRoomsCollection(db);
  const code = normalizeRoomCode(input.code);
  const playerId = sanitizePlayerId(input.playerId);
  const displayName = sanitizeDisplayName(input.displayName);
  const room = await getRoomOrThrow(code, db);

  if (!isRoomJoinable(room)) {
    throw new RoomServiceError("ROOM_FULL", "Room is not joinable.");
  }

  assertPlayerNotInRoom(room, playerId);

  const updatedRoom: RoomDocument = {
    ...room,
    players: [...room.players, { playerId, displayName, isReady: false, joinedAt: new Date() }],
    teamSelections: {
      ...room.teamSelections,
      [playerId]: [],
    },
    updatedAt: new Date(),
  };

  await rooms.updateOne({ code }, { $set: updatedRoom });
  return updatedRoom;
};

export const setPlayerReady = async (input: SetPlayerReadyInput, dbArg?: Db): Promise<RoomDocument> => {
  const db = await getDbOrDefault(dbArg);
  const rooms = getRoomsCollection(db);
  const code = normalizeRoomCode(input.code);
  const playerId = sanitizePlayerId(input.playerId);
  const room = await getRoomOrThrow(code, db);

  assertRoomHasPlayer(room, playerId);

  const updatedPlayers = room.players.map((player) =>
    player.playerId === playerId ? { ...player, isReady: input.isReady } : player,
  );
  const updatedTeamSelections =
    input.isReady
      ? room.teamSelections
      : {
          ...room.teamSelections,
          [playerId]: [],
        };
  const everyoneReady = updatedPlayers.length === room.settings.maxPlayers && updatedPlayers.every((p) => p.isReady);
  const updatedRoom: RoomDocument = {
    ...room,
    status: everyoneReady && room.status === "waiting" ? "team_selection" : room.status,
    players: updatedPlayers,
    teamSelections: updatedTeamSelections,
    updatedAt: new Date(),
  };

  await rooms.updateOne({ code }, { $set: updatedRoom });
  return updatedRoom;
};

export const markRoomInBattle = async (code: string, dbArg?: Db): Promise<RoomDocument> => {
  const db = await getDbOrDefault(dbArg);
  const rooms = getRoomsCollection(db);
  const normalizedCode = normalizeRoomCode(code);
  const room = await getRoomOrThrow(normalizedCode, db);

  const everyoneReady = room.players.length === room.settings.maxPlayers && room.players.every((player) => player.isReady);
  if (!everyoneReady) {
    throw new RoomServiceError("INVALID_ACTION", "All players must be ready before starting.");
  }

  const updatedRoom: RoomDocument = {
    ...room,
    status: "in_battle",
    battleId: normalizedCode,
    updatedAt: new Date(),
  };

  await rooms.updateOne({ code: normalizedCode }, { $set: updatedRoom });
  return updatedRoom;
};

export type AutofillTeamInput = {
  code: string;
  playerId: string;
};

export const autofillPlayerTeam = async (
  input: AutofillTeamInput,
  dbArg?: Db,
): Promise<RoomDocument> => {
  const db = await getDbOrDefault(dbArg);
  const rooms = getRoomsCollection(db);
  const code = normalizeRoomCode(input.code);
  const playerId = sanitizePlayerId(input.playerId);
  const room = await getRoomOrThrow(code, db);

  assertRoomHasPlayer(room, playerId);
  if (room.status !== "team_selection") {
    throw new RoomServiceError("INVALID_ACTION", "Autofill only allowed during team selection.");
  }

  const desiredSize = room.settings.maxTeamSize;
  const currentSelection = room.teamSelections[playerId] ?? [];
  const remainingSlots = desiredSize - currentSelection.length;
  if (remainingSlots <= 0) {
    return room;
  }

  const pool = await db
    .collection<{ pokedexId: number; battleMoveIds?: string[] }>("pokemon")
    .find({ battleMoveIds: { $size: 4 } }, { projection: { _id: 0, pokedexId: 1 } })
    .sort({ pokedexId: 1 })
    .toArray();
  const candidates = pool
    .map((doc) => doc.pokedexId)
    .filter((id) => !currentSelection.includes(id));

  if (candidates.length < remainingSlots) {
    throw new RoomServiceError(
      "INVALID_ACTION",
      "No hay suficientes Pokémon disponibles para autocompletar el equipo.",
    );
  }

  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const tmp = candidates[index];
    candidates[index] = candidates[swap];
    candidates[swap] = tmp;
  }

  const filled = [...currentSelection, ...candidates.slice(0, remainingSlots)];

  const updatedRoom: RoomDocument = {
    ...room,
    teamSelections: {
      ...room.teamSelections,
      [playerId]: filled,
    },
    updatedAt: new Date(),
  };

  await rooms.updateOne({ code }, { $set: updatedRoom });
  return updatedRoom;
};

export const setPlayerTeamSelection = async (input: SetTeamSelectionInput, dbArg?: Db): Promise<RoomDocument> => {
  const db = await getDbOrDefault(dbArg);
  const rooms = getRoomsCollection(db);
  const code = normalizeRoomCode(input.code);
  const playerId = sanitizePlayerId(input.playerId);
  const pokemonIds = sanitizeTeamSelection(input.pokemonIds);
  const room = await getRoomOrThrow(code, db);

  assertRoomHasPlayer(room, playerId);
  if (room.status !== "team_selection") {
    throw new RoomServiceError("INVALID_ACTION", "Team selection is only allowed during team selection phase.");
  }

  const updatedRoom: RoomDocument = {
    ...room,
    teamSelections: {
      ...room.teamSelections,
      [playerId]: pokemonIds,
    },
    updatedAt: new Date(),
  };

  await rooms.updateOne({ code }, { $set: updatedRoom });
  return updatedRoom;
};

export const getRoomByCode = async (code: string, dbArg?: Db): Promise<RoomDocument> => {
  const db = await getDbOrDefault(dbArg);
  return getRoomOrThrow(code, db);
};
