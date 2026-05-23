import { getStabMultiplier, getTypeMultiplier, type TypeRelations } from "./type-effectiveness";
import type { BattlePokemonSnapshot } from "../battle-service/battle.model";

export type DamageMoveData = {
  name: string;
  type: string;
  power: number | null;
  accuracy: number | null;
  damageClass: string;
};

export type DamageResult = {
  didHit: boolean;
  isCritical: boolean;
  randomFactor: number;
  stabMultiplier: number;
  typeMultiplier: number;
  burnMultiplier: number;
  damage: number;
};

const CRITICAL_HIT_CHANCE = 1 / 24;

const rollRandomFactor = (): number => {
  return 0.85 + Math.random() * 0.15;
};

const getAttackStat = (attacker: BattlePokemonSnapshot, damageClass: string): number => {
  if (damageClass === "special") {
    return attacker.calculatedStats.specialAttack;
  }

  return attacker.calculatedStats.attack;
};

const getDefenseStat = (defender: BattlePokemonSnapshot, damageClass: string): number => {
  if (damageClass === "special") {
    return defender.calculatedStats.specialDefense;
  }

  return defender.calculatedStats.defense;
};

const didMoveHit = (accuracy: number | null): boolean => {
  if (accuracy === null) {
    return true;
  }

  return Math.random() * 100 <= accuracy;
};

export const calculateMoveDamage = (
  attacker: BattlePokemonSnapshot,
  defender: BattlePokemonSnapshot,
  move: DamageMoveData,
  typeRelationsByType: Record<string, TypeRelations>,
): DamageResult => {
  const didHit = didMoveHit(move.accuracy);
  if (!didHit || move.power === null || move.power <= 0) {
    return {
      didHit,
      isCritical: false,
      randomFactor: 1,
      stabMultiplier: 1,
      typeMultiplier: 1,
      burnMultiplier: 1,
      damage: 0,
    };
  }

  const attackStat = getAttackStat(attacker, move.damageClass);
  const defenseStat = getDefenseStat(defender, move.damageClass);
  const base = Math.floor(
    Math.floor((((2 * attacker.level) / 5 + 2) * move.power * attackStat) / Math.max(1, defenseStat)) / 50,
  ) + 2;

  const stabMultiplier = getStabMultiplier(move.type, attacker.types);
  const typeMultiplier = getTypeMultiplier(move.type, defender.types, typeRelationsByType);
  const isCritical = Math.random() < CRITICAL_HIT_CHANCE;
  const criticalMultiplier = isCritical ? 1.5 : 1;
  const attackerHasBurn = attacker.statusEffects.some((status) => status.kind === "burn");
  const burnMultiplier = attackerHasBurn && move.damageClass === "physical" ? 0.5 : 1;
  const randomFactor = rollRandomFactor();
  const modified = Math.floor(
    base * stabMultiplier * typeMultiplier * criticalMultiplier * burnMultiplier * randomFactor,
  );
  const minDamage = typeMultiplier > 0 ? 1 : 0;

  return {
    didHit: true,
    isCritical,
    randomFactor,
    stabMultiplier,
    typeMultiplier,
    burnMultiplier,
    damage: Math.max(minDamage, modified),
  };
};
