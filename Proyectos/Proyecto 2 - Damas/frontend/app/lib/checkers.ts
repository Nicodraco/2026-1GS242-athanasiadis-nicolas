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

function dirsFor(piece: string, player: Player): Array<[number, number]> {
  return isKing(piece) ? KING_DIRS : MAN_DIRS[player];
}

export function pieceCaptures(board: Board, r: number, c: number): Move[] {
  const piece = board[r][c];
  const player = colorOf(piece);
  if (!player) return [];
  const out: Move[] = [];
  const opp: Player = player === 'white' ? 'black' : 'white';
  for (const [dr, dc] of dirsFor(piece, player)) {
    const jr = r + dr, jc = c + dc;
    const tr = r + 2 * dr, tc = c + 2 * dc;
    if (inBounds(tr, tc) && board[tr][tc] === '' && colorOf(board[jr][jc]) === opp) {
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
      if (caps.length) { captures.push(...caps); continue; }
      for (const [dr, dc] of dirsFor(piece, player)) {
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc) && board[nr][nc] === '') {
          simple.push({ from: [r, c], to: [nr, nc], captures: null });
        }
      }
    }
  }
  return captures.length ? captures : simple;
}

export function movesFromSquare(
  board: Board, player: Player, from: [number, number], restrictFrom: [number, number] | null
): Move[] {
  if (restrictFrom) {
    if (from[0] !== restrictFrom[0] || from[1] !== restrictFrom[1]) return [];
    return pieceCaptures(board, from[0], from[1]);
  }
  return legalMoves(board, player).filter(m => m.from[0] === from[0] && m.from[1] === from[1]);
}
