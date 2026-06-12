export const SIZE = 8;
export type Player = 'white' | 'black';
export type Board = string[][];

export interface Move {
  from: [number, number];
  to: [number, number];
  captures: [number, number] | null;
}

const MAN_DIRS: Record<Player, Array<[number, number]>> = {
  white: [[-1, -1], [-1, 1]],
  black: [[1, -1], [1, 1]],
};
const KING_DIRS: Array<[number, number]> = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

export function opponent(player: Player): Player {
  return player === 'white' ? 'black' : 'white';
}

export function colorOf(piece: string): Player | null {
  if (piece === 'w' || piece === 'W') return 'white';
  if (piece === 'b' || piece === 'B') return 'black';
  return null;
}

export function isKing(piece: string): boolean {
  return piece === 'W' || piece === 'B';
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

export function initialBoard(): Board {
  const board: Board = Array.from({ length: SIZE }, () => Array(SIZE).fill(''));
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if ((r + c) % 2 === 1) {
        if (r < 3) board[r][c] = 'b';
        else if (r > 4) board[r][c] = 'w';
      }
    }
  }
  return board;
}

function dirsFor(piece: string, player: Player): Array<[number, number]> {
  return isKing(piece) ? KING_DIRS : MAN_DIRS[player];
}

export function pieceCaptures(board: Board, r: number, c: number): Move[] {
  const piece = board[r][c];
  const player = colorOf(piece);
  if (!player) return [];
  const out: Move[] = [];
  for (const [dr, dc] of dirsFor(piece, player)) {
    const jr = r + dr;
    const jc = c + dc;
    const tr = r + 2 * dr;
    const tc = c + 2 * dc;
    if (
      inBounds(tr, tc) &&
      board[tr][tc] === '' &&
      colorOf(board[jr][jc]) === opponent(player)
    ) {
      out.push({ from: [r, c], to: [tr, tc], captures: [jr, jc] });
    }
  }
  return out;
}

export function legalMoves(board: Board, player: Player): Move[] {
  const captures: Move[] = [];
  const simple: Move[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const piece = board[r][c];
      if (colorOf(piece) !== player) continue;
      const caps = pieceCaptures(board, r, c);
      if (caps.length) {
        captures.push(...caps);
        continue;
      }
      for (const [dr, dc] of dirsFor(piece, player)) {
        const nr = r + dr;
        const nc = c + dc;
        if (inBounds(nr, nc) && board[nr][nc] === '') {
          simple.push({ from: [r, c], to: [nr, nc], captures: null });
        }
      }
    }
  }
  return captures.length ? captures : simple;
}

function crowns(piece: string, row: number): string {
  if (piece === 'w' && row === 0) return 'W';
  if (piece === 'b' && row === SIZE - 1) return 'B';
  return piece;
}

export function applyMove(board: Board, move: Move): Board {
  const next: Board = board.map((row) => row.slice());
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  const piece = next[fr][fc];
  next[fr][fc] = '';
  if (move.captures) {
    const [cr, cc] = move.captures;
    next[cr][cc] = '';
  }
  next[tr][tc] = crowns(piece, tr);
  return next;
}

export function canContinueCapture(board: Board, r: number, c: number): boolean {
  const piece = board[r][c];
  if (!piece) return false;
  return pieceCaptures(board, r, c).length > 0;
}

export function winner(board: Board, playerToMove: Player): Player | null {
  let whites = 0;
  let blacks = 0;
  for (const row of board) {
    for (const p of row) {
      const c = colorOf(p);
      if (c === 'white') whites++;
      else if (c === 'black') blacks++;
    }
  }
  if (whites === 0) return 'black';
  if (blacks === 0) return 'white';
  if (legalMoves(board, playerToMove).length === 0) return opponent(playerToMove);
  return null;
}
