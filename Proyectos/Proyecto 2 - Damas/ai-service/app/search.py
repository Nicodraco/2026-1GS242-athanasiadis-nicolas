"""Busqueda informada por heuristica con lookahead de 3 niveles.

La consigna pide A* sobre estados del tablero con f = g + h, g = 0 (todos los
movimientos cuestan igual, domina la heuristica) y profundidad 3. En un juego
por turnos eso equivale a explorar el arbol de estados alternando el jugador y
quedarse con el camino que maximiza h a favor de la IA, podando las ramas que
el rival nunca elegiria (alfa-beta). Es la lectura adversarial que el propio
enunciado describe como "similar a Minimax con heuristica".
"""

from __future__ import annotations

import math
import random
from typing import Optional

from .checkers import (
    SIZE,
    Board,
    Move,
    apply_move,
    color_of,
    is_king,
    legal_moves,
    opponent,
    piece_captures,
)

MAX_DEPTH = 3


def piece_value(piece: str, row: int) -> float:
    if is_king(piece):
        return 1.75  # bonus por pieza coronada (dama)
    # bonus por avance: cuanto mas cerca de coronar, mas vale el peon
    if piece == "w":
        return 1.0 + (SIZE - 1 - row) * 0.1
    return 1.0 + row * 0.1


def evaluate(board: Board, ai_player: str) -> float:
    """h: material propio menos del rival, con bonus de avance y coronacion."""
    score = 0.0
    for r in range(SIZE):
        for c in range(SIZE):
            piece = board[r][c]
            if piece == "":
                continue
            value = piece_value(piece, r)
            score += value if color_of(piece) == ai_player else -value
    return score


def _search(
    board: Board, player: str, depth: int, alpha: float, beta: float, ai_player: str
) -> float:
    moves = legal_moves(board, player)
    if not moves:
        # el jugador en turno no puede mover -> pierde
        return -1e6 if player == ai_player else 1e6
    if depth == 0:
        return evaluate(board, ai_player)

    if player == ai_player:
        best = -math.inf
        for move in moves:
            value = _search(apply_move(board, move), opponent(player), depth - 1, alpha, beta, ai_player)
            best = max(best, value)
            alpha = max(alpha, best)
            if beta <= alpha:
                break
        return best

    best = math.inf
    for move in moves:
        value = _search(apply_move(board, move), opponent(player), depth - 1, alpha, beta, ai_player)
        best = min(best, value)
        beta = min(beta, best)
        if beta <= alpha:
            break
    return best


def best_move(
    board: Board,
    current_player: str,
    must_continue_from: Optional[list[int]] = None,
) -> Optional[Move]:
    if must_continue_from is not None:
        # Multi-salto: solo capturas desde la pieza obligada a continuar.
        r, c = must_continue_from
        moves = piece_captures(board, r, c)
    else:
        moves = legal_moves(board, current_player)
    if not moves:
        return None
    random.shuffle(moves)  # variedad entre movimientos de igual valor
    best_value = -math.inf
    chosen = moves[0]
    for move in moves:
        value = _search(
            apply_move(board, move),
            opponent(current_player),
            MAX_DEPTH - 1,
            -math.inf,
            math.inf,
            current_player,
        )
        if value > best_value:
            best_value = value
            chosen = move
    return chosen
