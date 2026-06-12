import type { Db } from "mongodb";

import {
  applyMajorStatus,
  clearStatusEffectsOnSwitch,
  getEndTurnStatusDamage,
  tickStatusEffects,
  type MajorStatusKind,
} from "../battle-engine/status";
import { calculatePokemonStats, type BaseStats } from "../battle-engine/stats";
import { calculateMoveDamage } from "../battle-engine/damage";
import { resolveTurnOrder, pickInitialTurnStarter } from "../battle-engine/turn-order";
import { getDb } from "../../lib/mongodb";
import { getRoomsCollection } from "../rooms-service";
import {
  createBattleLogEntry,
  getBattlesCollection,
  type BattleDocument,
  type BattlePokemonSnapshot,
  type PendingAction,
  type PendingMoveAction,
  type PendingSwitchAction,
  type PlayerTurnSnapshot,
} from "./battle.model";
import { BattleServiceError } from "./errors";

type PokemonCatalogDocument = {
  pokedexId: number;
  name: string;
  types: string[];
  baseStats: Record<string, number>;
  spriteUrl?: string | null;
  spriteFrontUrl?: string | null;
  spriteBackUrl?: string | null;
  spriteAnimatedFrontUrl?: string | null;
  spriteAnimatedBackUrl?: string | null;
  battleMoveIds: string[];
};

type MoveCatalogDocument = {
  name: string;
  type: string;
  power: number | null;
  accuracy: number | null;
  priority: number;
  damageClass: string;
  effectShort: string | null;
  effect: string | null;
  effectChance: number | null;
};

type TypeCatalogDocument = {
  name: string;
  doubleDamageFrom: string[];
  doubleDamageTo: string[];
  halfDamageFrom: string[];
  halfDamageTo: string[];
  noDamageFrom: string[];
  noDamageTo: string[];
};

export type CreateBattleTeamInput = {
  playerId: string;
  pokemonIds: number[];
};

export type CreateBattleInput = {
  roomCode: string;
  teams: [CreateBattleTeamInput, CreateBattleTeamInput];
};

export type SubmitBattleActionInput = {
  roomCode: string;
  playerId: string;
  action:
    | {
        type: "move";
        moveId: string;
      }
    | {
        type: "switch";
        nextActivePokemonIndex: number;
      };
};

type ResolveTurnResult = {
  battle: BattleDocument;
  resolved: boolean;
};

const BATTLE_TEAM_LEVEL = 50;
const POKEAPI_SPRITES_BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

const getDefaultSpriteUrls = (pokemonId: number): { front: string; back: string } => {
  return {
    front: `${POKEAPI_SPRITES_BASE}/${pokemonId}.png`,
    back: `${POKEAPI_SPRITES_BASE}/back/${pokemonId}.png`,
  };
};

const resolveSpriteUrls = (
  pokemonDoc: PokemonCatalogDocument,
): { staticFront: string; staticBack: string; animatedFront: string | null; animatedBack: string | null } => {
  const defaults = getDefaultSpriteUrls(pokemonDoc.pokedexId);
  const staticFront = pokemonDoc.spriteFrontUrl ?? pokemonDoc.spriteUrl ?? defaults.front;
  const staticBack = pokemonDoc.spriteBackUrl ?? defaults.back;
  return {
    staticFront,
    staticBack,
    animatedFront: pokemonDoc.spriteAnimatedFrontUrl ?? null,
    animatedBack: pokemonDoc.spriteAnimatedBackUrl ?? null,
  };
};

const normalizeBaseStats = (baseStats: Record<string, number>): BaseStats => {
  const hp = baseStats.hp;
  const attack = baseStats.attack;
  const defense = baseStats.defense;
  const specialAttack = baseStats["special-attack"];
  const specialDefense = baseStats["special-defense"];
  const speed = baseStats.speed;

  if (
    typeof hp !== "number" ||
    typeof attack !== "number" ||
    typeof defense !== "number" ||
    typeof specialAttack !== "number" ||
    typeof specialDefense !== "number" ||
    typeof speed !== "number"
  ) {
    throw new Error("Invalid pokemon base stats");
  }

  return {
    hp,
    attack,
    defense,
    "special-attack": specialAttack,
    "special-defense": specialDefense,
    speed,
  };
};

const createTeamSnapshot = (pokemonDocs: PokemonCatalogDocument[]): BattlePokemonSnapshot[] => {
  return pokemonDocs.map((pokemonDoc) => {
    const baseStats = normalizeBaseStats(pokemonDoc.baseStats);
    const calculatedStats = calculatePokemonStats(baseStats, { level: BATTLE_TEAM_LEVEL });
    const sprites = resolveSpriteUrls(pokemonDoc);

    return {
      pokemonId: pokemonDoc.pokedexId,
      name: pokemonDoc.name,
      level: BATTLE_TEAM_LEVEL,
      types: pokemonDoc.types,
      spriteFrontUrl: sprites.staticFront,
      spriteBackUrl: sprites.staticBack,
      spriteAnimatedFrontUrl: sprites.animatedFront,
      spriteAnimatedBackUrl: sprites.animatedBack,
      baseStats,
      calculatedStats,
      currentHp: calculatedStats.hp,
      maxHp: calculatedStats.hp,
      battleMoveIds: pokemonDoc.battleMoveIds,
      statusEffects: [],
    };
  });
};

const syncPlayerDerivedFields = (player: PlayerTurnSnapshot): void => {
  player.faintedCount = player.team.filter((pokemon) => pokemon.currentHp <= 0).length;
};

const getPlayerSnapshot = (battle: BattleDocument, playerId: string): PlayerTurnSnapshot => {
  const player = battle.turnSnapshot.players.find((entry) => entry.playerId === playerId);
  if (!player) {
    throw new BattleServiceError("PLAYER_NOT_IN_ROOM", "Player is not part of this battle.");
  }

  return player;
};

const getActivePokemon = (player: PlayerTurnSnapshot): BattlePokemonSnapshot => {
  const active = player.team[player.activePokemonIndex];
  if (!active) {
    throw new BattleServiceError("INVALID_ACTION", "Active pokemon is not valid.");
  }

  return active;
};

const detectStatusFromMove = (move: MoveCatalogDocument): MajorStatusKind | null => {
  const effectText = `${move.effectShort ?? ""} ${move.effect ?? ""}`.toLowerCase();
  if (effectText.includes("paraly")) {
    return "paralysis";
  }

  if (effectText.includes("burn")) {
    return "burn";
  }

  if (effectText.includes("poison")) {
    return "poison";
  }

  return null;
};

const getStatusApplyChance = (move: MoveCatalogDocument): number => {
  if (move.effectChance === null) {
    const effectText = `${move.effectShort ?? ""} ${move.effect ?? ""}`.toLowerCase();
    if (effectText.includes("chance")) {
      return 0;
    }

    return 1;
  }

  return Math.max(0, Math.min(100, move.effectChance)) / 100;
};

const evaluateWinner = (battle: BattleDocument): string | null => {
  const [first, second] = battle.turnSnapshot.players;
  if (!first || !second) {
    return null;
  }

  if (first.faintedCount >= first.team.length) {
    return second.playerId;
  }

  if (second.faintedCount >= second.team.length) {
    return first.playerId;
  }

  return null;
};

const tryAutoSwitch = (battle: BattleDocument, player: PlayerTurnSnapshot): void => {
  const active = getActivePokemon(player);
  if (active.currentHp > 0) {
    return;
  }

  const nextIndex = player.team.findIndex((pokemon) => pokemon.currentHp > 0);
  if (nextIndex === -1) {
    return;
  }

  player.activePokemonIndex = nextIndex;
  battle.battleLog.push(
    createBattleLogEntry(
      battle.turn,
      "AUTO_SWITCH",
      `${player.playerId} envia automaticamente a ${player.team[nextIndex].name}.`,
      { playerId: player.playerId, nextActivePokemonIndex: nextIndex },
    ),
  );
};

const applyEndTurnStatuses = (battle: BattleDocument): void => {
  for (const player of battle.turnSnapshot.players) {
    const active = getActivePokemon(player);
    if (active.currentHp <= 0) {
      continue;
    }

    for (const status of active.statusEffects) {
      const statusDamage = getEndTurnStatusDamage(status, active.maxHp);
      if (statusDamage > 0) {
        active.currentHp = Math.max(0, active.currentHp - statusDamage);
        battle.battleLog.push(
          createBattleLogEntry(
            battle.turn,
            "STATUS_DAMAGE",
            `${active.name} sufre ${statusDamage} de daño por ${status.kind}.`,
            { playerId: player.playerId, status: status.kind, damage: statusDamage },
          ),
        );
      }
    }

    active.statusEffects = tickStatusEffects(active.statusEffects);
    syncPlayerDerivedFields(player);

    if (active.currentHp <= 0) {
      battle.battleLog.push(
        createBattleLogEntry(
          battle.turn,
          "FAINT",
          `${active.name} se debilitó por daño de estado.`,
          { playerId: player.playerId, pokemonId: active.pokemonId },
        ),
      );
      tryAutoSwitch(battle, player);
      syncPlayerDerivedFields(player);
    }
  }
};

const executeSwitchAction = (
  battle: BattleDocument,
  player: PlayerTurnSnapshot,
  action: PendingSwitchAction,
): void => {
  const currentActive = getActivePokemon(player);
  if (action.nextActivePokemonIndex === player.activePokemonIndex) {
    throw new BattleServiceError("INVALID_ACTION", "Cannot switch to the same active pokemon.");
  }

  const nextPokemon = player.team[action.nextActivePokemonIndex];
  if (!nextPokemon) {
    throw new BattleServiceError("INVALID_ACTION", "Switch target index is not valid.");
  }

  if (nextPokemon.currentHp <= 0) {
    throw new BattleServiceError("POKEMON_FAINTED", "Cannot switch to a fainted pokemon.");
  }

  currentActive.statusEffects = clearStatusEffectsOnSwitch();
  player.activePokemonIndex = action.nextActivePokemonIndex;
  battle.battleLog.push(
    createBattleLogEntry(
      battle.turn,
      "SWITCH",
      `${player.playerId} cambia de ${currentActive.name} a ${nextPokemon.name}.`,
      { playerId: player.playerId, from: currentActive.name, to: nextPokemon.name },
    ),
  );
};

const moveCache = new Map<string, MoveCatalogDocument>();
const typeCache = new Map<string, TypeCatalogDocument>();

const fetchMoveByName = async (db: Db, moveName: string): Promise<MoveCatalogDocument> => {
  const cached = moveCache.get(moveName);
  if (cached) {
    return cached;
  }

  const move = await db.collection<MoveCatalogDocument>("moves").findOne({ name: moveName });
  if (!move) {
    throw new BattleServiceError("INVALID_ACTION", `Move ${moveName} was not found.`);
  }

  moveCache.set(moveName, move);
  return move;
};

const fetchTypeRelations = async (
  db: Db,
  defendingTypes: string[],
): Promise<Record<string, TypeCatalogDocument>> => {
  const result: Record<string, TypeCatalogDocument> = {};
  const missingTypes: string[] = [];

  for (const typeName of defendingTypes) {
    const cached = typeCache.get(typeName);
    if (cached) {
      result[typeName] = cached;
    } else {
      missingTypes.push(typeName);
    }
  }

  if (missingTypes.length > 0) {
    const typeDocs = await db
      .collection<TypeCatalogDocument>("types")
      .find({ name: { $in: missingTypes } })
      .toArray();

    for (const doc of typeDocs) {
      typeCache.set(doc.name, doc);
      result[doc.name] = doc;
    }
  }

  return result;
};

const maybeApplyMoveStatus = (
  battle: BattleDocument,
  move: MoveCatalogDocument,
  targetPlayer: PlayerTurnSnapshot,
): void => {
  const activeTarget = getActivePokemon(targetPlayer);
  if (activeTarget.currentHp <= 0 || activeTarget.statusEffects.length > 0) {
    return;
  }

  const status = detectStatusFromMove(move);
  if (!status) {
    return;
  }

  if (Math.random() > getStatusApplyChance(move)) {
    return;
  }

  activeTarget.statusEffects = applyMajorStatus(activeTarget.statusEffects, status, move.name);
  battle.battleLog.push(
    createBattleLogEntry(
      battle.turn,
      "STATUS_APPLIED",
      `${activeTarget.name} quedó bajo ${status}.`,
      { playerId: targetPlayer.playerId, status, moveId: move.name },
    ),
  );
};

const executeMoveAction = async (
  db: Db,
  battle: BattleDocument,
  attacker: PlayerTurnSnapshot,
  defender: PlayerTurnSnapshot,
  action: PendingMoveAction,
): Promise<void> => {
  const attackerActive = getActivePokemon(attacker);
  const defenderActive = getActivePokemon(defender);

  if (attackerActive.currentHp <= 0) {
    battle.battleLog.push(
      createBattleLogEntry(
        battle.turn,
        "SKIP_FAINTED",
        `${attackerActive.name} no puede actuar porque está debilitado.`,
        { playerId: attacker.playerId, pokemonId: attackerActive.pokemonId },
      ),
    );
    return;
  }

  const isParalyzed = attackerActive.statusEffects.some((status) => status.kind === "paralysis");
  if (isParalyzed && Math.random() < 0.25) {
    battle.battleLog.push(
      createBattleLogEntry(
        battle.turn,
        "PARALYSIS_SKIP",
        `${attackerActive.name} está paralizado y no se puede mover.`,
        { playerId: attacker.playerId, pokemonId: attackerActive.pokemonId },
      ),
    );
    return;
  }

  if (!attackerActive.battleMoveIds.includes(action.moveId)) {
    throw new BattleServiceError("INVALID_ACTION", "Move does not belong to active pokemon.");
  }

  const move = await fetchMoveByName(db, action.moveId);
  const typeRelationsByType = await fetchTypeRelations(db, defenderActive.types);
  const damageResult = calculateMoveDamage(attackerActive, defenderActive, move, typeRelationsByType);

  if (!damageResult.didHit) {
    battle.battleLog.push(
      createBattleLogEntry(
        battle.turn,
        "MOVE_MISS",
        `${attackerActive.name} usó ${move.name}, pero falló.`,
        { playerId: attacker.playerId, moveId: move.name },
      ),
    );
    return;
  }

  if (damageResult.damage > 0) {
    defenderActive.currentHp = Math.max(0, defenderActive.currentHp - damageResult.damage);
  }

  battle.battleLog.push(
    createBattleLogEntry(
      battle.turn,
      "MOVE_HIT",
      `${attackerActive.name} usó ${move.name} e hizo ${damageResult.damage} de daño.`,
      {
        playerId: attacker.playerId,
        moveId: move.name,
        damage: damageResult.damage,
        critical: damageResult.isCritical,
        typeMultiplier: damageResult.typeMultiplier,
      },
    ),
  );

  if (damageResult.typeMultiplier > 1) {
    battle.battleLog.push(
      createBattleLogEntry(
        battle.turn,
        "TYPE_EFFECTIVE",
        "¡Es súper efectivo!",
        { typeMultiplier: damageResult.typeMultiplier },
      ),
    );
  } else if (damageResult.typeMultiplier > 0 && damageResult.typeMultiplier < 1) {
    battle.battleLog.push(
      createBattleLogEntry(
        battle.turn,
        "TYPE_RESISTED",
        "No fue muy efectivo.",
        { typeMultiplier: damageResult.typeMultiplier },
      ),
    );
  } else if (damageResult.typeMultiplier === 0) {
    battle.battleLog.push(
      createBattleLogEntry(
        battle.turn,
        "TYPE_IMMUNE",
        "No tuvo efecto.",
        { typeMultiplier: damageResult.typeMultiplier },
      ),
    );
  }

  if (damageResult.isCritical) {
    battle.battleLog.push(createBattleLogEntry(battle.turn, "CRITICAL_HIT", "¡Golpe crítico!"));
  }

  maybeApplyMoveStatus(battle, move, defender);
  syncPlayerDerivedFields(defender);

  if (defenderActive.currentHp <= 0) {
    battle.battleLog.push(
      createBattleLogEntry(
        battle.turn,
        "FAINT",
        `${defenderActive.name} se debilitó.`,
        { playerId: defender.playerId, pokemonId: defenderActive.pokemonId },
      ),
    );
    tryAutoSwitch(battle, defender);
    syncPlayerDerivedFields(defender);
  }
};

const validateActionPayload = (action: SubmitBattleActionInput["action"]): void => {
  if (action.type === "move" && action.moveId.trim().length === 0) {
    throw new BattleServiceError("INVALID_ACTION", "Move id cannot be empty.");
  }

  if (action.type === "switch" && (!Number.isInteger(action.nextActivePokemonIndex) || action.nextActivePokemonIndex < 0)) {
    throw new BattleServiceError("INVALID_ACTION", "Switch index must be a non-negative integer.");
  }
};

const resolveTurn = async (db: Db, battle: BattleDocument): Promise<BattleDocument> => {
  const actionByPlayerId = new Map(battle.pendingActions.map((action) => [action.playerId, action]));
  const [firstPlayerId, secondPlayerId] = resolveTurnOrder(
    battle.playerIds,
    battle.firstTurnStarterPlayerId,
    battle.turn,
  );

  battle.turnSnapshot.status = "resolving_turn";
  battle.turnSnapshot.updatedAt = new Date();

  for (const actorPlayerId of [firstPlayerId, secondPlayerId]) {
    const actorAction = actionByPlayerId.get(actorPlayerId);
    if (!actorAction) {
      continue;
    }

    const actor = getPlayerSnapshot(battle, actorPlayerId);
    const defender = getPlayerSnapshot(
      battle,
      actorPlayerId === battle.playerIds[0] ? battle.playerIds[1] : battle.playerIds[0],
    );

    if (actorAction.type === "switch") {
      executeSwitchAction(battle, actor, actorAction);
    } else {
      await executeMoveAction(db, battle, actor, defender, actorAction);
    }

    syncPlayerDerivedFields(actor);
    syncPlayerDerivedFields(defender);
    const winnerAfterAction = evaluateWinner(battle);
    if (winnerAfterAction) {
      battle.winner = winnerAfterAction;
      break;
    }
  }

  if (!battle.winner) {
    applyEndTurnStatuses(battle);
    battle.winner = evaluateWinner(battle);
  }

  if (battle.winner) {
    battle.phase = "finished";
    battle.turnSnapshot.status = "finished";
    battle.battleLog.push(
      createBattleLogEntry(
        battle.turn,
        "BATTLE_END",
        `${battle.winner} ganó la batalla.`,
        { winner: battle.winner },
      ),
    );
  } else {
    battle.turn += 1;
    battle.turnSnapshot.turn = battle.turn;
    battle.turnSnapshot.status = "waiting_actions";
  }

  battle.pendingActions = [];
  battle.turnSnapshot.updatedAt = new Date();
  battle.updatedAt = new Date();
  return battle;
};

const getDbOrDefault = async (providedDb?: Db): Promise<Db> => {
  if (providedDb) {
    return providedDb;
  }

  return getDb();
};

const validateTeamInput = (team: CreateBattleTeamInput): void => {
  if (!team.playerId.trim()) {
    throw new BattleServiceError("INVALID_ACTION", "Team playerId cannot be empty.");
  }

  if (team.pokemonIds.length === 0 || team.pokemonIds.length > 6) {
    throw new BattleServiceError("INVALID_ACTION", "Each player team must contain from 1 to 6 pokemon.");
  }

  const unique = new Set(team.pokemonIds);
  if (unique.size !== team.pokemonIds.length) {
    throw new BattleServiceError("INVALID_ACTION", "Team cannot contain duplicate pokemon.");
  }
};

export const createBattleForRoom = async (input: CreateBattleInput, dbArg?: Db): Promise<BattleDocument> => {
  const db = await getDbOrDefault(dbArg);
  const rooms = getRoomsCollection(db);
  const room = await rooms.findOne({ code: input.roomCode });

  if (!room) {
    throw new BattleServiceError("ROOM_NOT_FOUND", "Room was not found.");
  }

  if (room.players.length !== 2) {
    throw new BattleServiceError("INVALID_ACTION", "Battle requires exactly two players.");
  }

  validateTeamInput(input.teams[0]);
  validateTeamInput(input.teams[1]);

  const roomPlayerIds = room.players.map((player) => player.playerId);
  const [teamOne, teamTwo] = input.teams;
  if (!roomPlayerIds.includes(teamOne.playerId) || !roomPlayerIds.includes(teamTwo.playerId)) {
    throw new BattleServiceError("PLAYER_NOT_IN_ROOM", "Teams contain player outside of room.");
  }

  if (teamOne.playerId === teamTwo.playerId) {
    throw new BattleServiceError("INVALID_ACTION", "Both teams cannot belong to the same player.");
  }

  const pokemonCollection = db.collection<PokemonCatalogDocument>("pokemon");
  const allPokemonIds = [...teamOne.pokemonIds, ...teamTwo.pokemonIds];
  const pokemonDocs = await pokemonCollection.find({ pokedexId: { $in: allPokemonIds } }).toArray();
  const pokemonById = new Map(pokemonDocs.map((doc) => [doc.pokedexId, doc]));

  const resolvePlayerTeam = (pokemonIds: number[]): PokemonCatalogDocument[] => {
    return pokemonIds.map((pokemonId) => {
      const doc = pokemonById.get(pokemonId);
      if (!doc) {
        throw new BattleServiceError("INVALID_ACTION", `Pokemon ${pokemonId} is not available in catalog.`);
      }

      if (doc.battleMoveIds.length !== 4) {
        throw new BattleServiceError("INVALID_ACTION", `Pokemon ${doc.name} does not have 4 battle moves.`);
      }

      return doc;
    });
  };

  const firstPlayerId = room.players[0].playerId;
  const secondPlayerId = room.players[1].playerId;
  const teamsByPlayer = new Map<string, PokemonCatalogDocument[]>([
    [teamOne.playerId, resolvePlayerTeam(teamOne.pokemonIds)],
    [teamTwo.playerId, resolvePlayerTeam(teamTwo.pokemonIds)],
  ]);

  const firstTeam = teamsByPlayer.get(firstPlayerId);
  const secondTeam = teamsByPlayer.get(secondPlayerId);
  if (!firstTeam || !secondTeam) {
    throw new BattleServiceError("INVALID_ACTION", "Missing team for room players.");
  }

  const playerIds: [string, string] = [firstPlayerId, secondPlayerId];
  const firstTurnStarterPlayerId = pickInitialTurnStarter(playerIds);
  const now = new Date();

  const battle: BattleDocument = {
    roomCode: room.code,
    playerIds,
    firstTurnStarterPlayerId,
    phase: "in_progress",
    turn: 1,
    turnSnapshot: {
      turn: 1,
      status: "waiting_actions",
      players: [
        {
          playerId: firstPlayerId,
          activePokemonIndex: 0,
          faintedCount: 0,
          team: createTeamSnapshot(firstTeam),
        },
        {
          playerId: secondPlayerId,
          activePokemonIndex: 0,
          faintedCount: 0,
          team: createTeamSnapshot(secondTeam),
        },
      ],
      updatedAt: now,
    },
    pendingActions: [],
    battleLog: [
      createBattleLogEntry(
        1,
        "BATTLE_START",
        `La batalla inició. ${firstTurnStarterPlayerId} comienza el primer turno.`,
        { firstTurnStarterPlayerId },
      ),
    ],
    winner: null,
    createdAt: now,
    updatedAt: now,
  };

  for (const player of battle.turnSnapshot.players) {
    syncPlayerDerivedFields(player);
  }

  const battles = getBattlesCollection(db);
  await battles.updateOne({ roomCode: room.code }, { $set: battle }, { upsert: true });
  await rooms.updateOne(
    { code: room.code },
    { $set: { status: "in_battle", battleId: room.code, updatedAt: new Date() } },
  );

  return battle;
};

export const submitBattleAction = async (
  input: SubmitBattleActionInput,
  dbArg?: Db,
): Promise<ResolveTurnResult> => {
  validateActionPayload(input.action);
  const db = await getDbOrDefault(dbArg);
  const rooms = getRoomsCollection(db);
  const room = await rooms.findOne({ code: input.roomCode });
  if (!room) {
    throw new BattleServiceError("ROOM_NOT_FOUND", "Room was not found.");
  }

  if (!room.players.some((player) => player.playerId === input.playerId)) {
    throw new BattleServiceError("PLAYER_NOT_IN_ROOM", "Player is not in the room.");
  }

  const battles = getBattlesCollection(db);
  const battle = await battles.findOne({ roomCode: input.roomCode });
  if (!battle) {
    throw new BattleServiceError("BATTLE_NOT_FOUND", "Battle was not found.");
  }

  if (battle.phase === "finished") {
    throw new BattleServiceError("BATTLE_FINISHED", "Battle is already finished.");
  }

  const existingAction = battle.pendingActions.find((action) => action.playerId === input.playerId);
  if (existingAction) {
    throw new BattleServiceError("ACTION_ALREADY_SUBMITTED", "Player already submitted an action this turn.");
  }

  const player = getPlayerSnapshot(battle, input.playerId);
  const activePokemon = getActivePokemon(player);
  if (activePokemon.currentHp <= 0) {
    throw new BattleServiceError("POKEMON_FAINTED", "Active pokemon is fainted.");
  }

  if (input.action.type === "move" && !activePokemon.battleMoveIds.includes(input.action.moveId)) {
    throw new BattleServiceError("INVALID_ACTION", "Move is not valid for active pokemon.");
  }

  if (input.action.type === "switch") {
    const targetPokemon = player.team[input.action.nextActivePokemonIndex];
    if (!targetPokemon) {
      throw new BattleServiceError("INVALID_ACTION", "Switch target is not valid.");
    }

    if (targetPokemon.currentHp <= 0) {
      throw new BattleServiceError("POKEMON_FAINTED", "Cannot switch to fainted pokemon.");
    }
  }

  const submittedAt = new Date();
  const pendingAction: PendingAction =
    input.action.type === "move"
      ? {
          type: "move",
          playerId: input.playerId,
          moveId: input.action.moveId,
          submittedAt,
        }
      : {
          type: "switch",
          playerId: input.playerId,
          nextActivePokemonIndex: input.action.nextActivePokemonIndex,
          submittedAt,
        };

  battle.pendingActions.push(pendingAction);
  let resolved = false;
  let battleFinished = false;
  if (battle.pendingActions.length >= battle.playerIds.length) {
    await resolveTurn(db, battle);
    resolved = true;
    battleFinished = battle.winner !== null;
  } else {
    battle.turnSnapshot.updatedAt = new Date();
    battle.updatedAt = new Date();
  }

  await battles.updateOne({ roomCode: battle.roomCode }, { $set: battle });

  if (battleFinished) {
    await rooms.updateOne(
      { code: battle.roomCode },
      { $set: { status: "finished", updatedAt: new Date() } },
    );
  }

  return {
    battle,
    resolved,
  };
};

export const getBattleByRoomCode = async (roomCode: string, dbArg?: Db): Promise<BattleDocument | null> => {
  const db = await getDbOrDefault(dbArg);
  return getBattlesCollection(db).findOne({ roomCode });
};

export const forfeitBattle = async (
  roomCode: string,
  playerId: string,
  dbArg?: Db,
): Promise<BattleDocument> => {
  const db = await getDbOrDefault(dbArg);
  const battles = getBattlesCollection(db);

  const battle = await battles.findOne({ roomCode });
  if (!battle) {
    throw new BattleServiceError("BATTLE_NOT_FOUND", "Batalla no encontrada.");
  }

  if (battle.phase === "finished") {
    throw new BattleServiceError("INVALID_ACTION", "La batalla ya terminó.");
  }

  if (!battle.playerIds.includes(playerId)) {
    throw new BattleServiceError("PLAYER_NOT_IN_ROOM", "No eres parte de esta batalla.");
  }

  const winnerId = battle.playerIds.find((id) => id !== playerId) ?? battle.playerIds[0];
  const now = new Date();
  const forfeitEntry = createBattleLogEntry(battle.turn, "FORFEIT", `${playerId} se rindió. ¡${winnerId} gana!`, { playerId });

  await battles.updateOne(
    { roomCode },
    {
      $set: {
        phase: "finished",
        winner: winnerId,
        updatedAt: now,
        "turnSnapshot.status": "finished",
      },
      $push: { battleLog: forfeitEntry },
    },
  );

  return (await battles.findOne({ roomCode })) as BattleDocument;
};
