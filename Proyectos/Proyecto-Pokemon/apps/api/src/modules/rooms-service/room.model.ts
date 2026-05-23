import type { Collection, Db } from "mongodb";

export const ROOM_STATUSES = ["waiting", "team_selection", "in_battle", "finished"] as const;

export type RoomStatus = (typeof ROOM_STATUSES)[number];

export type RoomPlayer = {
  playerId: string;
  displayName: string;
  isReady: boolean;
  joinedAt: Date;
};

export type RoomSettings = {
  maxPlayers: number;
  maxTeamSize: number;
};

export type RoomDocument = {
  code: string;
  status: RoomStatus;
  players: RoomPlayer[];
  teamSelections: Record<string, number[]>;
  battleId: string | null;
  settings: RoomSettings;
  createdAt: Date;
  updatedAt: Date;
};

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  maxPlayers: 2,
  maxTeamSize: 6,
};

export const getRoomsCollection = (db: Db): Collection<RoomDocument> => {
  return db.collection<RoomDocument>("rooms");
};

export const ensureRoomIndexes = async (db: Db): Promise<void> => {
  const rooms = getRoomsCollection(db);

  await Promise.all([
    rooms.createIndex({ code: 1 }, { unique: true }),
    rooms.createIndex({ status: 1 }),
    rooms.createIndex({ "players.playerId": 1 }),
  ]);
};

export const isRoomJoinable = (room: RoomDocument): boolean => {
  return room.status === "waiting" && room.players.length < room.settings.maxPlayers;
};
