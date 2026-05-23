import type { Collection, Db } from "mongodb";

import type { BaseStats, CalculatedStats } from "../battle-engine/stats";
import type { BattleStatusEffect } from "../battle-engine/status";

export const BATTLE_STATUSES = ["waiting_actions", "resolving_turn", "finished"] as const;
export const BATTLE_PHASES = ["team_selection", "in_progress", "finished"] as const;
export const BATTLE_ACTION_TYPES = ["move", "switch"] as const;

export type BattleStatus = (typeof BATTLE_STATUSES)[number];
export type BattlePhase = (typeof BATTLE_PHASES)[number];
export type BattleActionType = (typeof BATTLE_ACTION_TYPES)[number];

export type PendingMoveAction = {
  playerId: string;
  type: "move";
  moveId: string;
  submittedAt: Date;
};

export type PendingSwitchAction = {
  playerId: string;
  type: "switch";
  nextActivePokemonIndex: number;
  submittedAt: Date;
};

export type PendingAction = PendingMoveAction | PendingSwitchAction;

export type BattlePokemonSnapshot = {
  pokemonId: number;
  name: string;
  level: number;
  types: string[];
  spriteFrontUrl: string | null;
  spriteBackUrl: string | null;
  spriteAnimatedFrontUrl?: string | null;
  spriteAnimatedBackUrl?: string | null;
  baseStats: BaseStats;
  calculatedStats: CalculatedStats;
  currentHp: number;
  maxHp: number;
  battleMoveIds: string[];
  statusEffects: BattleStatusEffect[];
};

export type PlayerTurnSnapshot = {
  playerId: string;
  activePokemonIndex: number;
  faintedCount: number;
  team: BattlePokemonSnapshot[];
};

export type TurnSnapshot = {
  turn: number;
  status: BattleStatus;
  players: PlayerTurnSnapshot[];
  updatedAt: Date;
};

export type BattleLogEntry = {
  eventId: string;
  turn: number;
  eventType: string;
  message: string;
  createdAt: Date;
  metadata: Record<string, string | number | boolean> | null;
};

export type BattleDocument = {
  roomCode: string;
  playerIds: [string, string];
  firstTurnStarterPlayerId: string;
  phase: BattlePhase;
  turn: number;
  turnSnapshot: TurnSnapshot;
  pendingActions: PendingAction[];
  battleLog: BattleLogEntry[];
  winner: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export const getBattlesCollection = (db: Db): Collection<BattleDocument> => {
  return db.collection<BattleDocument>("battles");
};

export const ensureBattleIndexes = async (db: Db): Promise<void> => {
  const battles = getBattlesCollection(db);

  await Promise.all([
    battles.createIndex({ roomCode: 1 }, { unique: true }),
    battles.createIndex({ phase: 1 }),
    battles.createIndex({ winner: 1 }),
    battles.createIndex({ updatedAt: -1 }),
  ]);
};

export const createBattleLogEntry = (
  turn: number,
  eventType: string,
  message: string,
  metadata: Record<string, string | number | boolean> | null = null,
): BattleLogEntry => {
  return {
    eventId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    turn,
    eventType,
    message,
    metadata,
    createdAt: new Date(),
  };
};
