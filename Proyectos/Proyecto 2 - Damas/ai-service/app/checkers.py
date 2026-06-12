"""Motor de damas (English draughts) compartido por la IA.

Representacion del tablero: matriz 8x8 de strings.
  ''  casilla vacia
  'w' / 'b'  peon blanco / negro
  'W' / 'B'  dama (rey) blanca / negra

Convencion: blancas abajo (filas 5-7) avanzan hacia la fila 0;
negras arriba (filas 0-2) avanzan hacia la fila 7. Blancas mueven primero.
Las piezas viven solo en casillas oscuras: (fila + columna) impar.
"""

from __future__ import annotations

from typing import Optional, TypedDict

SIZE = 8

Board = list[list[str]]


class Move(TypedDict):
    from_: list[int]
    to: list[int]
    captures: Optional[list[int]]


MAN_DIRS = {
    "white": [(-1, -1), (-1, 1)],
    "black": [(1, -1), (1, 1)],
}
KING_DIRS = [(-1, -1), (-1, 1), (1, -1), (1, 1)]


def opponent(player: str) -> str:
    return "black" if player == "white" else "white"


def color_of(piece: str) -> Optional[str]:
    if piece in ("w", "W"):
        return "white"
    if piece in ("b", "B"):
        return "black"
    return None


def is_king(piece: str) -> bool:
    return piece in ("W", "B")


def in_bounds(r: int, c: int) -> bool:
    return 0 <= r < SIZE and 0 <= c < SIZE


def initial_board() -> Board:
    board: Board = [["" for _ in range(SIZE)] for _ in range(SIZE)]
    for r in range(SIZE):
        for c in range(SIZE):
            if (r + c) % 2 == 1:
                if r < 3:
                    board[r][c] = "b"
                elif r > 4:
                    board[r][c] = "w"
    return board


def _dirs(piece: str, player: str) -> list[tuple[int, int]]:
    return KING_DIRS if is_king(piece) else MAN_DIRS[player]


def piece_captures(board: Board, r: int, c: int) -> list[Move]:
    """Capturas inmediatas de la pieza ubicada en (r, c)."""
    piece = board[r][c]
    player = color_of(piece)
    if player is None:
        return []
    moves: list[Move] = []
    for dr, dc in _dirs(piece, player):
        jr, jc = r + dr, c + dc
        tr, tc = r + 2 * dr, c + 2 * dc
        if (
            in_bounds(tr, tc)
            and board[tr][tc] == ""
            and color_of(board[jr][jc]) == opponent(player)
        ):
            moves.append({"from_": [r, c], "to": [tr, tc], "captures": [jr, jc]})
    return moves


def legal_moves(board: Board, player: str) -> list[Move]:
    """Movimientos legales del jugador. Si hay capturas, son obligatorias."""
    captures: list[Move] = []
    simple: list[Move] = []
    for r in range(SIZE):
        for c in range(SIZE):
            piece = board[r][c]
            if color_of(piece) != player:
                continue
            caps = piece_captures(board, r, c)
            if caps:
                captures.extend(caps)
                continue
            for dr, dc in _dirs(piece, player):
                nr, nc = r + dr, c + dc
                if in_bounds(nr, nc) and board[nr][nc] == "":
                    simple.append({"from_": [r, c], "to": [nr, nc], "captures": None})
    return captures if captures else simple


def _crowns(piece: str, row: int) -> str:
    if piece == "w" and row == 0:
        return "W"
    if piece == "b" and row == SIZE - 1:
        return "B"
    return piece


def apply_move(board: Board, move: Move) -> Board:
    new_board: Board = [row[:] for row in board]
    fr, fc = move["from_"]
    tr, tc = move["to"]
    piece = new_board[fr][fc]
    new_board[fr][fc] = ""
    cap = move["captures"]
    if cap is not None:
        new_board[cap[0]][cap[1]] = ""
    new_board[tr][tc] = _crowns(piece, tr)
    return new_board


def can_continue_capture(board: Board, r: int, c: int) -> bool:
    """True si la pieza recien movida (no coronada) puede seguir capturando."""
    piece = board[r][c]
    if is_king(piece):
        return len(piece_captures(board, r, c)) > 0
    # Un peon que acaba de coronar termina su turno.
    return len(piece_captures(board, r, c)) > 0


def winner(board: Board, player_to_move: str) -> Optional[str]:
    """Devuelve el ganador si la partida termino, si no None."""
    whites = sum(1 for row in board for p in row if color_of(p) == "white")
    blacks = sum(1 for row in board for p in row if color_of(p) == "black")
    if whites == 0:
        return "black"
    if blacks == 0:
        return "white"
    if not legal_moves(board, player_to_move):
        return opponent(player_to_move)
    return None
