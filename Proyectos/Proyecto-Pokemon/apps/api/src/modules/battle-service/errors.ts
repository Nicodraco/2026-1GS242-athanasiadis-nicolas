export type BattleErrorCode =
  | "ROOM_NOT_FOUND"
  | "PLAYER_NOT_IN_ROOM"
  | "BATTLE_NOT_FOUND"
  | "BATTLE_FINISHED"
  | "INVALID_ACTION"
  | "ACTION_ALREADY_SUBMITTED"
  | "POKEMON_FAINTED";

export class BattleServiceError extends Error {
  readonly code: BattleErrorCode;

  constructor(code: BattleErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}
