export type TypeRelations = {
  name: string;
  doubleDamageFrom: string[];
  doubleDamageTo: string[];
  halfDamageFrom: string[];
  halfDamageTo: string[];
  noDamageFrom: string[];
  noDamageTo: string[];
};

const getTypeEntry = (
  defendingType: string,
  relationsByType: Record<string, TypeRelations>,
): TypeRelations | null => {
  return relationsByType[defendingType] ?? null;
};

export const getTypeMultiplierAgainstSingleType = (
  attackingType: string,
  defendingType: string,
  relationsByType: Record<string, TypeRelations>,
): number => {
  const typeEntry = getTypeEntry(defendingType, relationsByType);
  if (!typeEntry) {
    return 1;
  }

  if (typeEntry.noDamageFrom.includes(attackingType)) {
    return 0;
  }

  if (typeEntry.doubleDamageFrom.includes(attackingType)) {
    return 2;
  }

  if (typeEntry.halfDamageFrom.includes(attackingType)) {
    return 0.5;
  }

  return 1;
};

export const getTypeMultiplier = (
  attackingType: string,
  defendingTypes: string[],
  relationsByType: Record<string, TypeRelations>,
): number => {
  if (defendingTypes.length === 0) {
    return 1;
  }

  return defendingTypes.reduce((multiplier, defendingType) => {
    return multiplier * getTypeMultiplierAgainstSingleType(attackingType, defendingType, relationsByType);
  }, 1);
};

export const getStabMultiplier = (moveType: string, pokemonTypes: string[]): number => {
  return pokemonTypes.includes(moveType) ? 1.5 : 1;
};
