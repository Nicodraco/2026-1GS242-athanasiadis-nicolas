# Pokemon Battle Rooms

Implementación del proyecto de batallas Pokémon 1v1 por salas para UTP/FISC – Desarrollo de Software.

Stack obligatorio del PRD:

- **Frontend:** TanStack Start (React) en `apps/web`
- **Backend:** Hono sobre Bun en `apps/api`
- **Base de datos:** MongoDB (Docker Compose)

Extras de este fork:

- **Login con Clerk** (opcional pero recomendado; si no hay claves se usa modo invitado).
- **Tienda de shinys con Stripe** (`/shop`): pago único que activa sprites shiny en batalla.

---

## 1. Variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus claves. Las claves de Clerk y Stripe son opcionales para el flujo MVP, pero
son necesarias para la tienda/login.

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/pokemon_battle_rooms
MONGODB_DB_NAME=pokemon_battle_rooms

# API
API_PORT=3001
API_PUBLIC_URL=http://localhost:3001

# Web
WEB_PORT=3000
WEB_PUBLIC_URL=http://localhost:3000
VITE_API_BASE_URL=http://localhost:3001

# Clerk (login) — https://dashboard.clerk.com → API Keys
VITE_CLERK_PUBLISHABLE_KEY=pk_test_d2lyZWQtb3NwcmV5LTcuY2xlcmsuYWNjb3VudHMuZGV2JA
CLERK_SECRET_KEY=sk_test_oTNcWUrTaMoHsuIsMoXoxIJfWypKFKkk66OEdYtH7S

# Stripe — https://dashboard.stripe.com/test/apikeys
STRIPE_SECRET_KEY=sk_test_51Ta71sCj9WWWVoAKfkqm3A2NBBBN0ChMqrDWBCIqYnMahpTU3w2zmKTLOca2I3nWUmX21d1qmFM2rCyYiLF0f6lo00QI2rqUwP
STRIPE_WEBHOOK_SECRET=
STRIPE_SHINY_PRICE_USD_CENTS=499
STRIPE_SHINY_PRODUCT_ID=prod_UZFhr8iG0hBz6f
```

## 2. Instalar dependencias

```bash
bun install
```

## 3. Levantar servicios

### Opción A: Docker (todo en uno)

```bash
docker compose up --build
```

Levanta Mongo, API (3001) y Web (3000) leyendo automáticamente el `.env` del repo.

### Opción B: local

En 3 terminales:

```bash
# Terminal 1: MongoDB local (usa docker para simplicidad)
docker run --rm -p 27017:27017 mongo:7

# Terminal 2: API
bun run dev:api

# Terminal 3: Web
bun run dev:web
```

Healthcheck:

```bash
curl http://localhost:3001/health
```

## 4. Importar catálogo PokeAPI (obligatorio antes de jugar)

Con MongoDB arriba:

```bash
# Generación 1 a 6 (Bulbasaur a Volcanion, pokedexId 1-721)
bun run --filter api import:pokeapi -- --max-id 721 --limit 800

# Solo gen 1
bun run --filter api import:pokeapi -- --max-id 151 --limit 200

# Por count (sin importar generación)
bun run --filter api import:pokeapi -- --limit 300
```

Flags soportadas:

- `--max-id N` corta la importación al pokedexId N (ej. 721 = fin de gen 6).
- `--limit N` cantidad máxima a importar (sirve de seguro).

El importador descarga sólo Pokémon con 4 movimientos físicos/especiales únicos, guarda
movimientos, relaciones de daño por tipo, y **cachea sprites localmente** en
`apps/api/assets/sprites` para que el frontend no dependa de internet durante la batalla.

## 5. Flujo de juego

1. Abre `http://localhost:3000` en 2 navegadores distintos (o dos perfiles).
2. Jugador A escribe su nombre y crea una sala. Comparte el código.
3. Jugador B se une con el código.
4. Ambos marcan **Listo** → se inicia selección de equipo.
5. Cada jugador elige 6 Pokémon (hay un timer de auto-relleno de 60s si tardas).
6. Cuando ambos completan, hay un countdown de 7s y comienza la batalla.
7. Cada turno, elige un movimiento o cambia Pokémon. El backend resuelve.

## 6. Reglas MVP implementadas

- Batalla 1v1 por turnos en sala con código compartido.
- Acción por turno: **movimiento** o **cambio**.
- Validaciones backend: jugador en sala, sin doble acción, movimiento válido, activo vivo.
- Coin flip inicial para decidir quién empieza + alternancia por turno.
- Cálculo de daño con: STAB, efectividad de tipo desde PokéAPI, crítico (1/24), random
  factor (0.85–1.0), **burn modifier 0.5 si físico**.
- Estados temporales (veneno/quemadura/parálisis) por 3 turnos, se limpian al cambio.
- Auto-switch al siguiente Pokémon vivo si el activo se debilita por estado.
- Victoria al debilitar todos los Pokémon del rival.
- Sprites animados (Showdown) en batalla con fallback a estáticos.

### Mejoras incluidas

- Auto-relleno de equipo si un jugador no completa 6 en 60s.
- Polling cada 2s del estado de batalla para sincronización entre navegadores.
- Log de batalla con eventos detallados (crítico, super efectivo, estados).

## 7. API principal

### Salas

- `POST /rooms` — crear sala
- `POST /rooms/:code/join` — unirse
- `POST /rooms/:code/ready` — toggle ready
- `POST /rooms/:code/team` — guardar selección de equipo
- `POST /rooms/:code/autofill` — autocompletar equipo desde catálogo
- `POST /rooms/:code/start` — iniciar batalla
- `GET /rooms/:code` — leer estado

### Batalla

- `POST /battles/:roomCode/action` — enviar acción (move|switch)
- `GET /battles/:roomCode/state` — leer estado completo
- `GET /battles/:roomCode/log` — log de eventos

### Catálogo

- `GET /catalog/pokemon?limit=300`
- `GET /catalog/moves?names=tackle,ember,...`

### Pagos / shinys

- `GET /users/:userId/profile` — perfil + estado shiny
- `POST /payments/checkout` — crear sesión de Stripe Checkout
- `POST /payments/confirm` — confirmar sesión desde callback de success
- `POST /payments/webhook` — webhook firmado de Stripe

### Errores estandarizados

`ROOM_NOT_FOUND`, `ROOM_FULL`, `PLAYER_NOT_IN_ROOM`, `INVALID_ACTION`,
`ACTION_ALREADY_SUBMITTED`, `POKEMON_FAINTED`, `STRIPE_DISABLED`.

## 8. Stripe en local (modo test)

1. En el [Dashboard de Stripe](https://dashboard.stripe.com/test/apikeys) copia tu
   `STRIPE_SECRET_KEY` (sk_test_...) al `.env`.
2. Para probar el webhook localmente, usa Stripe CLI:

   ```bash
   stripe listen --forward-to localhost:3001/payments/webhook
   ```

   Copia el webhook secret que imprime (whsec_...) a `STRIPE_WEBHOOK_SECRET`.
3. La página `/shop` también ofrece confirmación inmediata vía `/payments/confirm` con el
   `session_id` que Stripe pasa al `success_url`. Esto permite probar sin webhook.
4. Para tarjetas de prueba usa `4242 4242 4242 4242`, fecha futura cualquiera, CVC cualquiera.

## 9. Clerk en local

1. Crea una aplicación en [Clerk Dashboard](https://dashboard.clerk.com).
2. Copia las claves API a `.env`:
   - `VITE_CLERK_PUBLISHABLE_KEY` (pk_test_...)
   - `CLERK_SECRET_KEY` (sk_test_...)
3. Reinicia el servidor web. Aparecerá un botón "Iniciar sesión" en el header.

Si no configuras Clerk, la app sigue funcionando con identidades anónimas guardadas en
`localStorage`.

## 10. Limitaciones conocidas

- Sin matchmaking público.
- Sin reconexión ni modo espectador.
- El auto-relleno se ejecuta del lado del cliente: si un jugador cierra el navegador antes
  de los 60s, la sala se quedará en team_selection.
