import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.checkers import (  # noqa: E402
    apply_move,
    initial_board,
    legal_moves,
    winner,
)
from app.search import best_move  # noqa: E402

ok = 0
fail = 0


def check(name: str, cond: bool) -> None:
    global ok, fail
    if cond:
        ok += 1
        print(f"  OK   {name}")
    else:
        fail += 1
        print(f"  FAIL {name}")


# 1. Apertura: 7 movimientos simples para blancas.
board = initial_board()
moves = legal_moves(board, "white")
check("apertura blancas = 7 movimientos", len(moves) == 7)
check("ninguno es captura en apertura", all(m["captures"] is None for m in moves))

# 2. Captura obligatoria: blanca en (5,2), negra en (4,3), destino (3,4) vacio.
b = [["" for _ in range(8)] for _ in range(8)]
b[5][2] = "w"
b[4][3] = "b"
caps = legal_moves(b, "white")
check("captura obligatoria: solo capturas", len(caps) == 1 and caps[0]["captures"] == [4, 3])
after = apply_move(b, caps[0])
check("captura elimina la pieza saltada", after[4][3] == "" and after[3][4] == "w")

# 3. Coronacion: peon blanco en (1,2) avanza a (0,1) o (0,3) y corona.
b2 = [["" for _ in range(8)] for _ in range(8)]
b2[1][2] = "w"
mv = legal_moves(b2, "white")
crowned = apply_move(b2, mv[0])
check("peon blanco corona en fila 0", crowned[mv[0]["to"][0]][mv[0]["to"][1]] == "W")

# 4. Rey se mueve en las 4 diagonales.
b3 = [["" for _ in range(8)] for _ in range(8)]
b3[4][4] = "W"
king_moves = legal_moves(b3, "white")
check("rey tiene 4 movimientos diagonales", len(king_moves) == 4)

# 5. Sin piezas -> hay ganador.
b4 = [["" for _ in range(8)] for _ in range(8)]
b4[0][1] = "b"
check("blancas sin piezas -> gana negro", winner(b4, "white") == "black")

# 6. best_move desde la apertura responde rapido y es legal.
t0 = time.time()
mv = best_move(initial_board(), "white")
elapsed = time.time() - t0
legal_set = {(tuple(m["from_"]), tuple(m["to"])) for m in legal_moves(initial_board(), "white")}
check("best_move devuelve un movimiento", mv is not None)
check("best_move es legal", (tuple(mv["from_"]), tuple(mv["to"])) in legal_set)
check(f"best_move responde < 2s (tardo {elapsed:.3f}s)", elapsed < 2.0)

print(f"\n{ok} OK / {fail} FAIL")
sys.exit(1 if fail else 0)
