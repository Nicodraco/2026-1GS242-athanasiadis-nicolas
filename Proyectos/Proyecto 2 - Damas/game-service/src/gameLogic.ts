import {
  Board, Move, Player, applyMove, canContinueCapture,
  findLegalMove, initialBoard, isKing, opponent, winner,
} from './checkers';

export type GameStatus = 'waiting' | 'active' | 'finished';

export interface GameState {
  id: string;
  player1Id: string;
  player1Username: string;
  player2Id: string | null;
  player2Username: string | null;
  isVsAi: boolean;
  status: GameStatus;
  board: Board;
  currentPlayer: Player;
  mustContinueFrom: [number, number] | null;
  movesP1: number;
  movesP2: number;
  movesCount: number;
  winnerId: string | null;
}

export interface BroadcastState {
  gameId: string;
  status: GameStatus;
  board: Board;
  currentPlayer: Player;
  mustContinueFrom: [number, number] | null;
  player1: { id: string; username: string; color: 'white' };
  player2: { id: string; username: string; color: 'black' } | null;
  isVsAi: boolean;
  moves: { p1: number; p2: number };
  winnerId: string | null;
  winnerUsername: string | null;
}

export const AI_USER_ID = 'AI';
export const AI_USERNAME = 'IA (A*)';

export function buildInitialState(
  id: string, player1Id: string, player1Username: string, vsAi: boolean
): GameState {
  return {
    id, player1Id, player1Username,
    player2Id: vsAi ? AI_USER_ID : null,
    player2Username: vsAi ? AI_USERNAME : null,
    isVsAi: vsAi,
    status: vsAi ? 'active' : 'waiting',
    board: initialBoard(),
    currentPlayer: 'white',
    mustContinueFrom: null,
    movesP1: 0, movesP2: 0, movesCount: 0,
    winnerId: null,
  };
}

export function expectedUserIdForTurn(game: GameState): string | null {
  return game.currentPlayer === 'white' ? game.player1Id : game.player2Id;
}

export function toBroadcast(game: GameState): BroadcastState {
  const winnerUsername = game.winnerId === null ? null
    : game.winnerId === game.player1Id ? game.player1Username : game.player2Username;
  return {
    gameId: game.id, status: game.status, board: game.board,
    currentPlayer: game.currentPlayer, mustContinueFrom: game.mustContinueFrom,
    player1: { id: game.player1Id, username: game.player1Username, color: 'white' },
    player2: game.player2Id === null ? null
      : { id: game.player2Id, username: game.player2Username ?? '???', color: 'black' },
    isVsAi: game.isVsAi,
    moves: { p1: game.movesP1, p2: game.movesP2 },
    winnerId: game.winnerId, winnerUsername,
  };
}

export interface MoveOutcome {
  game: GameState;
  finished: boolean;
  turnEnded: boolean;
}

export function applyPlayerMove(
  game: GameState, from: [number, number], to: [number, number]
): MoveOutcome | { error: string } {
  if (game.status !== 'active') return { error: 'La partida no esta activa' };
  const legal = findLegalMove(game.board, game.currentPlayer, from, to, game.mustContinueFrom);
  if (!legal) return { error: 'Movimiento ilegal' };
  const pieceBefore = game.board[from[0]][from[1]];
  const nextBoard = applyMove(game.board, legal);
  const pieceAfter = nextBoard[to[0]][to[1]];
  const justCrowned = !isKing(pieceBefore) && isKing(pieceAfter);
  const mustContinue = legal.captures !== null && !justCrowned && canContinueCapture(nextBoard, to[0], to[1]);
  const playedColor = game.currentPlayer;
  const next: GameState = {
    ...game, board: nextBoard,
    mustContinueFrom: mustContinue ? to : null,
    currentPlayer: mustContinue ? playedColor : opponent(playedColor),
  };
  if (!mustContinue) {
    if (playedColor === 'white') next.movesP1 += 1;
    else next.movesP2 += 1;
    next.movesCount = next.movesP1 + next.movesP2;
  }
  const w = winner(next.board, next.currentPlayer);
  let finished = false;
  if (w) {
    finished = true;
    next.status = 'finished';
    next.winnerId = w === 'white' ? next.player1Id : next.player2Id;
  }
  return { game: next, finished, turnEnded: !mustContinue };
}

export interface RankingPayload {
  userId: string; username: string; movesCount: number; gameId: string; won: boolean;
}

export function rankingPayloadFor(game: GameState): RankingPayload | null {
  if (game.status !== 'finished' || game.winnerId === null) return null;
  if (game.winnerId === AI_USER_ID) return null;
  const isP1 = game.winnerId === game.player1Id;
  return {
    userId: game.winnerId,
    username: isP1 ? game.player1Username : (game.player2Username ?? '???'),
    movesCount: isP1 ? game.movesP1 : game.movesP2,
    gameId: game.id, won: true,
  };
}

export interface AiMoveRequest {
  board: Board;
  current_player: Player;
  must_continue_from: [number, number] | null;
}

export function aiRequestFor(game: GameState): AiMoveRequest {
  return {
    board: game.board,
    current_player: game.currentPlayer,
    must_continue_from: game.mustContinueFrom,
  };
}
