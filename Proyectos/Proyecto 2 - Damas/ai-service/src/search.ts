import {
  Board,
  Move,
  Player,
  applyMove,
  colorOf,
  isKing,
  legalMoves,
  opponent,
  pieceCaptures,
  winner,
} from './checkers';

function pieceValue(piece: string, row: number): number {
  if (isKing(piece)) return 1.75;
  if (piece === 'w') return 1.0 + (7 - row) * 0.1;
  return 1.0 + row * 0.1;
}

function evaluate(board: Board, aiPlayer: Player): number {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      const val = pieceValue(piece, r);
      score += colorOf(piece) === aiPlayer ? val : -val;
    }
  }
  return score;
}

interface AStarNode {
  board: Board;
  player: Player;
  move: Move | null;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | null;
}

export function bestMove(
  board: Board,
  currentPlayer: Player,
  mustContinueFrom: [number, number] | null
): Move | null {
  const moves = mustContinueFrom
    ? pieceCaptures(board, mustContinueFrom[0], mustContinueFrom[1])
    : legalMoves(board, currentPlayer);

  if (moves.length === 0) return null;

  const aiPlayer = currentPlayer;

  const startNode: AStarNode = {
    board,
    player: currentPlayer,
    move: null,
    g: 0,
    h: evaluate(board, aiPlayer),
    f: evaluate(board, aiPlayer),
    parent: null,
  };

  const openSet: AStarNode[] = [startNode];
  const closedSet = new Set<string>();

  let iterations = 0;
  const MAX_ITER = 5000;

  while (openSet.length > 0 && iterations < MAX_ITER) {
    iterations++;

    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;

    const boardKey = JSON.stringify(current.board) + current.player;
    if (closedSet.has(boardKey)) continue;
    closedSet.add(boardKey);

    if (current.move !== null) {
      const w = winner(current.board, opponent(current.player));
      if (w === aiPlayer) return current.move;
    }

    const nextMoves = legalMoves(current.board, current.player);

    if (nextMoves.length === 0) {
      if (current.move !== null) return current.move;
      continue;
    }

    for (const m of nextMoves) {
      const nextBoard = applyMove(current.board, m);
      const nextPlayer = opponent(current.player);
      const h = evaluate(nextBoard, aiPlayer);
      const g = current.g + 1;
      const neighbor: AStarNode = {
        board: nextBoard,
        player: nextPlayer,
        move: current.move ?? m,
        g,
        h,
        f: g + h,
        parent: current,
      };
      openSet.push(neighbor);
    }
  }

  if (openSet.length === 0 && moves.length > 0) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  if (openSet.length > 0) {
    const best = openSet.reduce((a, b) => (a.h > b.h ? a : b));
    return best.move ?? moves[0];
  }

  return moves[Math.floor(Math.random() * moves.length)];
}
