CREATE TABLE IF NOT EXISTS skins (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT,
  price         INTEGER NOT NULL DEFAULT 0,
  required_plan TEXT NOT NULL DEFAULT 'free' CHECK (required_plan IN ('free', 'premium')),
  image_url     TEXT
);

CREATE TABLE IF NOT EXISTS user_skins (
  user_id     TEXT NOT NULL,
  skin_id     INTEGER NOT NULL REFERENCES skins(id),
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, skin_id)
);

-- image_url se usa como "style key": el frontend mapea cada key a un estilo CSS de pieza.
INSERT INTO skins (name, description, price, required_plan, image_url) VALUES
  ('Classic',  'Las damas de toda la vida. Rojo sangre y negro carbon.',        0,   'free',    'classic'),
  ('Midnight', 'Azul medianoche con bordes duros.',                             0,   'free',    'midnight'),
  ('Slate',    'Gris piedra, minimalista y serio.',                             0,   'free',    'slate'),
  ('Neon',     'Verde acido y magenta electrico. Brilla en la oscuridad.',      150, 'premium', 'neon'),
  ('Gold',     'Oro macizo. Para los que ganan con estilo.',                    300, 'premium', 'gold'),
  ('Vapor',    'Vaporwave: cian y rosa pastel sobre cuadricula retro.',         220, 'premium', 'vapor'),
  ('Cyberpunk', 'Estilo futurista con neones cian y magenta.',                 250, 'premium', 'cyberpunk'),
  ('Forest',    'Colores terrosos y verdes profundos.',                         180, 'premium', 'forest'),
  ('Ocean',     'Azules profundos y espuma de mar.',                            200, 'premium', 'ocean')
ON CONFLICT DO NOTHING;
