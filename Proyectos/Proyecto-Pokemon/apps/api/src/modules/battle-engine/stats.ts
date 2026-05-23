export type BaseStats = {
  hp: number;
  attack: number;
  defense: number;
  "special-attack": number;
  "special-defense": number;
  speed: number;
};

export type CalculatedStats = {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
};

type StatCalculationOptions = {
  level?: number;
  iv?: number;
  ev?: number;
  natureMultiplier?: number;
};

const clampStage = (stage: number): number => {
  return Math.max(-6, Math.min(6, Math.floor(stage)));
};

const calculateHpStat = (base: number, level: number, iv: number, ev: number): number => {
  return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
};

const calculateNonHpStat = (
  base: number,
  level: number,
  iv: number,
  ev: number,
  natureMultiplier: number,
): number => {
  const raw = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
  return Math.floor(raw * natureMultiplier);
};

export const calculatePokemonStats = (
  baseStats: BaseStats,
  options: StatCalculationOptions = {},
): CalculatedStats => {
  const level = options.level ?? 50;
  const iv = options.iv ?? 31;
  const ev = options.ev ?? 0;
  const natureMultiplier = options.natureMultiplier ?? 1;

  return {
    hp: calculateHpStat(baseStats.hp, level, iv, ev),
    attack: calculateNonHpStat(baseStats.attack, level, iv, ev, natureMultiplier),
    defense: calculateNonHpStat(baseStats.defense, level, iv, ev, natureMultiplier),
    specialAttack: calculateNonHpStat(baseStats["special-attack"], level, iv, ev, natureMultiplier),
    specialDefense: calculateNonHpStat(baseStats["special-defense"], level, iv, ev, natureMultiplier),
    speed: calculateNonHpStat(baseStats.speed, level, iv, ev, natureMultiplier),
  };
};

export const applyStatStage = (value: number, stage: number): number => {
  const normalizedStage = clampStage(stage);

  if (normalizedStage >= 0) {
    return Math.floor((value * (2 + normalizedStage)) / 2);
  }

  return Math.floor((value * 2) / (2 + Math.abs(normalizedStage)));
};
