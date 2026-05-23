export const pickInitialTurnStarter = (playerIds: [string, string]): string => {
  return Math.random() < 0.5 ? playerIds[0] : playerIds[1];
};

export const resolveTurnOrder = (
  playerIds: [string, string],
  firstTurnStarterPlayerId: string,
  turn: number,
): [string, string] => {
  const [firstPlayerId, secondPlayerId] = playerIds;
  const baseStarter = firstTurnStarterPlayerId === secondPlayerId ? secondPlayerId : firstPlayerId;
  const baseFollower = baseStarter === firstPlayerId ? secondPlayerId : firstPlayerId;
  const isOddTurn = turn % 2 !== 0;

  if (isOddTurn) {
    return [baseStarter, baseFollower];
  }

  return [baseFollower, baseStarter];
};
