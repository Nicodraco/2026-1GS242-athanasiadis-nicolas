CREATE TABLE IF NOT EXISTS games (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id         TEXT NOT NULL,
  player1_username   TEXT NOT NULL,
  player2_id         TEXT,
  player2_username   TEXT,
  is_vs_ai           BOOLEAN NOT NULL DEFAULT false,
  status             TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
  board_state        JSONB NOT NULL,
  current_player     TEXT NOT NULL DEFAULT 'white' CHECK (current_player IN ('white', 'black')),
  must_continue_from JSONB,
  moves_p1           INTEGER NOT NULL DEFAULT 0,
  moves_p2           INTEGER NOT NULL DEFAULT 0,
  moves_count        INTEGER NOT NULL DEFAULT 0,
  winner_id          TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at        TIMESTAMPTZ
);
