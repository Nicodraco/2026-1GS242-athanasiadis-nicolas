export const MAJOR_STATUS_KINDS = ["poison", "burn", "paralysis"] as const;

export type MajorStatusKind = (typeof MAJOR_STATUS_KINDS)[number];

export type BattleStatusEffect = {
  kind: MajorStatusKind;
  remainingTurns: number;
  sourceMoveId: string | null;
};

export const DEFAULT_MAJOR_STATUS_DURATION = 3;

const clampTurns = (turns: number): number => {
  if (turns < 1) {
    return 1;
  }

  return Math.floor(turns);
};

export const hasMajorStatus = (
  statusEffects: BattleStatusEffect[],
  kind: MajorStatusKind,
): boolean => {
  return statusEffects.some((status) => status.kind === kind);
};

export const applyMajorStatus = (
  statusEffects: BattleStatusEffect[],
  kind: MajorStatusKind,
  sourceMoveId: string | null = null,
  duration = DEFAULT_MAJOR_STATUS_DURATION,
): BattleStatusEffect[] => {
  if (statusEffects.length > 0) {
    return statusEffects;
  }

  return [
    {
      kind,
      sourceMoveId,
      remainingTurns: clampTurns(duration),
    },
  ];
};

export const tickStatusEffects = (statusEffects: BattleStatusEffect[]): BattleStatusEffect[] => {
  return statusEffects
    .map((status) => ({
      ...status,
      remainingTurns: status.remainingTurns - 1,
    }))
    .filter((status) => status.remainingTurns > 0);
};

export const clearStatusEffectsOnSwitch = (): BattleStatusEffect[] => {
  return [];
};

export const getEndTurnStatusDamage = (
  status: BattleStatusEffect,
  maxHp: number,
): number => {
  if (status.kind === "poison" || status.kind === "burn") {
    return Math.max(1, Math.floor(maxHp / 8));
  }

  return 0;
};
