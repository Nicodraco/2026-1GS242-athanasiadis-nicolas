CREATE TABLE IF NOT EXISTS rankings (
  id          SERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL,
  username    TEXT NOT NULL,
  moves_count INTEGER NOT NULL,
  game_id     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rankings_moves ON rankings (moves_count ASC, created_at DESC);
