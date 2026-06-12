from typing import Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .search import best_move

app = FastAPI(title="ai-service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class MoveRequest(BaseModel):
    board: list[list[str]]
    current_player: Literal["white", "black"]
    must_continue_from: Optional[list[int]] = Field(default=None)


@app.get("/health")
def health():
    return {"ok": True, "service": "ai"}


@app.post("/ai/move")
def ai_move(req: MoveRequest):
    move = best_move(req.board, req.current_player, req.must_continue_from)
    if move is None:
        raise HTTPException(status_code=409, detail="No hay movimientos legales")
    return {"from": move["from_"], "to": move["to"]}
