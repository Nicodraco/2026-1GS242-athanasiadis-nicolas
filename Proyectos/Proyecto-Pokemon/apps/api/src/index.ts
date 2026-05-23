import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { z } from "zod";
import { fileURLToPath } from "url";
import { resolve } from "path";

import { env } from "./config/env";
import { getDb } from "./lib/mongodb";
import {
  BattleServiceError,
  createBattleForRoom,
  ensureBattleIndexes,
  forfeitBattle,
  getBattleByRoomCode,
  submitBattleAction,
} from "./modules/battle-service";
import { battleEngineModule } from "./modules/battle-engine";
import { battleServiceModule } from "./modules/battle-service";
import { importerModule } from "./modules/importer";
import {
  PaymentsError,
  createShinyCheckoutSession,
  ensureUserIndexes,
  fetchUserProfile,
  getStripeClient,
  handleCheckoutCompleted,
  isStripeEnabled,
  paymentsModule,
} from "./modules/payments";
import {
  RoomServiceError,
  autofillPlayerTeam,
  createRoom,
  ensureRoomIndexes,
  getRoomByCode,
  joinRoom,
  setPlayerReady,
  setPlayerTeamSelection,
} from "./modules/rooms-service";
import { roomsServiceModule } from "./modules/rooms-service";

const app = new Hono();
const ASSETS_ROOT = resolve(fileURLToPath(new URL("../assets", import.meta.url)));

app.use("*", cors({ origin: "*" }));
app.use("*", logger());
app.get("/sprites/*", serveStatic({ root: ASSETS_ROOT }));

const createRoomSchema = z.object({
  playerId: z.string().min(1),
  displayName: z.string().min(1),
  settings: z
    .object({
      maxPlayers: z.number().int().positive().optional(),
      maxTeamSize: z.number().int().positive().optional(),
    })
    .optional(),
});

const joinRoomSchema = z.object({
  playerId: z.string().min(1),
  displayName: z.string().min(1),
});

const readySchema = z.object({
  playerId: z.string().min(1),
  isReady: z.boolean(),
});

const teamSelectionSchema = z.object({
  playerId: z.string().min(1),
  pokemonIds: z.array(z.number().int().positive()).max(6),
});

const startBattleSchema = z.object({
  playerId: z.string().min(1),
  teams: z.tuple([
    z.object({
      playerId: z.string().min(1),
      pokemonIds: z.array(z.number().int().positive()).min(1).max(6),
    }),
    z.object({
      playerId: z.string().min(1),
      pokemonIds: z.array(z.number().int().positive()).min(1).max(6),
    }),
  ]),
});

const battleActionSchema = z.object({
  playerId: z.string().min(1),
  action: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("move"),
      moveId: z.string().min(1),
    }),
    z.object({
      type: z.literal("switch"),
      nextActivePokemonIndex: z.number().int().min(0),
    }),
  ]),
});

const toErrorResponse = (error: unknown): { status: number; body: { error: { code: string; message: string } } } => {
  if (error instanceof z.ZodError) {
    return {
      status: 400,
      body: {
        error: {
          code: "INVALID_ACTION",
          message: error.issues.map((issue) => issue.message).join("; "),
        },
      },
    };
  }

  if (error instanceof RoomServiceError) {
    const statusByCode: Record<string, number> = {
      ROOM_NOT_FOUND: 404,
      ROOM_FULL: 409,
      PLAYER_NOT_IN_ROOM: 403,
      INVALID_ACTION: 400,
    };

    return {
      status: statusByCode[error.code] ?? 400,
      body: {
        error: {
          code: error.code,
          message: error.message,
        },
      },
    };
  }

  if (error instanceof PaymentsError) {
    const statusByCode: Record<string, number> = {
      STRIPE_DISABLED: 503,
      INVALID_ACTION: 400,
      USER_NOT_FOUND: 404,
      STRIPE_ERROR: 502,
    };
    return {
      status: statusByCode[error.code] ?? 400,
      body: {
        error: {
          code: error.code,
          message: error.message,
        },
      },
    };
  }

  if (error instanceof BattleServiceError) {
    const statusByCode: Record<string, number> = {
      ROOM_NOT_FOUND: 404,
      PLAYER_NOT_IN_ROOM: 403,
      BATTLE_NOT_FOUND: 404,
      BATTLE_FINISHED: 409,
      INVALID_ACTION: 400,
      ACTION_ALREADY_SUBMITTED: 409,
      POKEMON_FAINTED: 409,
    };

    return {
      status: statusByCode[error.code] ?? 400,
      body: {
        error: {
          code: error.code,
          message: error.message,
        },
      },
    };
  }

  return {
    status: 500,
    body: {
      error: {
        code: "INTERNAL_ERROR",
        message: "Unexpected server error.",
      },
    },
  };
};

app.get("/health", async (c) => {
  const db = await getDb();
  await Promise.all([ensureRoomIndexes(db), ensureBattleIndexes(db), ensureUserIndexes(db)]);

  return c.json({
    status: "ok",
    service: "pokemon-battle-rooms-api",
    stripeEnabled: isStripeEnabled(),
    modules: [
      importerModule.name,
      battleEngineModule.name,
      roomsServiceModule.name,
      battleServiceModule.name,
      paymentsModule.name,
    ],
  });
});

app.get("/", (c) => {
  return c.json({
    message: "Pokemon Battle Rooms API",
    docs: "Room and battle endpoints are available.",
  });
});

app.post("/rooms", async (c) => {
  try {
    const payload = createRoomSchema.parse(await c.req.json());
    const room = await createRoom(payload);
    return c.json(room, 201);
  } catch (error) {
    const response = toErrorResponse(error);
    return c.json(response.body, response.status as 400 | 403 | 404 | 409 | 500);
  }
});

app.post("/rooms/:code/join", async (c) => {
  try {
    const payload = joinRoomSchema.parse(await c.req.json());
    const room = await joinRoom({
      code: c.req.param("code"),
      playerId: payload.playerId,
      displayName: payload.displayName,
    });
    return c.json(room);
  } catch (error) {
    const response = toErrorResponse(error);
    return c.json(response.body, response.status as 400 | 403 | 404 | 409 | 500);
  }
});

app.post("/rooms/:code/ready", async (c) => {
  try {
    const payload = readySchema.parse(await c.req.json());
    const room = await setPlayerReady({
      code: c.req.param("code"),
      playerId: payload.playerId,
      isReady: payload.isReady,
    });
    return c.json(room);
  } catch (error) {
    const response = toErrorResponse(error);
    return c.json(response.body, response.status as 400 | 403 | 404 | 409 | 500);
  }
});

app.post("/rooms/:code/team", async (c) => {
  try {
    const payload = teamSelectionSchema.parse(await c.req.json());
    const room = await setPlayerTeamSelection({
      code: c.req.param("code"),
      playerId: payload.playerId,
      pokemonIds: payload.pokemonIds,
    });
    return c.json(room);
  } catch (error) {
    const response = toErrorResponse(error);
    return c.json(response.body, response.status as 400 | 403 | 404 | 409 | 500);
  }
});

app.post("/rooms/:code/autofill", async (c) => {
  try {
    const payload = z.object({ playerId: z.string().min(1) }).parse(await c.req.json());
    const room = await autofillPlayerTeam({
      code: c.req.param("code"),
      playerId: payload.playerId,
    });
    return c.json(room);
  } catch (error) {
    const response = toErrorResponse(error);
    return c.json(response.body, response.status as 400 | 403 | 404 | 409 | 500);
  }
});

app.post("/rooms/:code/start", async (c) => {
  try {
    const payload = startBattleSchema.parse(await c.req.json());
    const room = await getRoomByCode(c.req.param("code"));
    if (!room.players.some((player) => player.playerId === payload.playerId)) {
      throw new RoomServiceError("PLAYER_NOT_IN_ROOM", "Player is not in this room.");
    }

    const battle = await createBattleForRoom({
      roomCode: room.code,
      teams: payload.teams,
    });
    return c.json(battle, 201);
  } catch (error) {
    const response = toErrorResponse(error);
    return c.json(response.body, response.status as 400 | 403 | 404 | 409 | 500);
  }
});

app.get("/rooms/:code", async (c) => {
  try {
    const room = await getRoomByCode(c.req.param("code"));
    return c.json(room);
  } catch (error) {
    const response = toErrorResponse(error);
    return c.json(response.body, response.status as 400 | 403 | 404 | 409 | 500);
  }
});

app.post("/battles/:roomCode/action", async (c) => {
  try {
    const payload = battleActionSchema.parse(await c.req.json());
    const result = await submitBattleAction({
      roomCode: c.req.param("roomCode"),
      playerId: payload.playerId,
      action: payload.action,
    });
    return c.json(result);
  } catch (error) {
    const response = toErrorResponse(error);
    return c.json(response.body, response.status as 400 | 403 | 404 | 409 | 500);
  }
});

app.post("/battles/:roomCode/forfeit", async (c) => {
  try {
    const { playerId } = z.object({ playerId: z.string().min(1) }).parse(await c.req.json());
    const battle = await forfeitBattle(c.req.param("roomCode"), playerId);
    return c.json(battle);
  } catch (error) {
    const response = toErrorResponse(error);
    return c.json(response.body, response.status as 400 | 403 | 404 | 409 | 500);
  }
});

app.get("/battles/:roomCode/state", async (c) => {
  try {
    const battle = await getBattleByRoomCode(c.req.param("roomCode"));
    if (!battle) {
      return c.json(
        {
          error: {
            code: "BATTLE_NOT_FOUND",
            message: "Battle was not found.",
          },
        },
        404,
      );
    }

    return c.json(battle);
  } catch (error) {
    const response = toErrorResponse(error);
    return c.json(response.body, response.status as 400 | 403 | 404 | 409 | 500);
  }
});

app.get("/battles/:roomCode/log", async (c) => {
  try {
    const battle = await getBattleByRoomCode(c.req.param("roomCode"));
    if (!battle) {
      return c.json(
        {
          error: {
            code: "BATTLE_NOT_FOUND",
            message: "Battle was not found.",
          },
        },
        404,
      );
    }

    return c.json({
      roomCode: battle.roomCode,
      turn: battle.turn,
      winner: battle.winner,
      battleLog: battle.battleLog,
    });
  } catch (error) {
    const response = toErrorResponse(error);
    return c.json(response.body, response.status as 400 | 403 | 404 | 409 | 500);
  }
});

app.get("/catalog/moves", async (c) => {
  try {
    const namesRaw = c.req.query("names");
    const names = namesRaw
      ? namesRaw
          .split(",")
          .map((name) => name.trim())
          .filter((name) => name.length > 0)
      : [];

    if (names.length === 0) {
      return c.json(
        {
          error: {
            code: "INVALID_ACTION",
            message: "At least one move name is required.",
          },
        },
        400,
      );
    }

    const unique = [...new Set(names)].slice(0, 200);
    const db = await getDb();
    const moves = await db
      .collection("moves")
      .find(
        { name: { $in: unique } },
        {
          projection: {
            _id: 0,
            name: 1,
            type: 1,
          },
        },
      )
      .toArray();

    return c.json({
      count: moves.length,
      items: moves,
    });
  } catch (error) {
    const response = toErrorResponse(error);
    return c.json(response.body, response.status as 400 | 403 | 404 | 409 | 500);
  }
});

app.get("/catalog/pokemon", async (c) => {
  try {
    const limitRaw = c.req.query("limit");
    const limitParsed = limitRaw ? Number.parseInt(limitRaw, 10) : 300;
    const limit = Number.isInteger(limitParsed) && limitParsed > 0 ? Math.min(limitParsed, 500) : 300;
    const db = await getDb();
    const pokemon = await db
      .collection("pokemon")
      .find(
        { pokedexId: { $lte: limit } },
        {
            projection: {
              _id: 0,
              pokedexId: 1,
              name: 1,
              types: 1,
              spriteUrl: 1,
              spriteFrontUrl: 1,
              spriteBackUrl: 1,
              battleMoveIds: 1,
            },
          },
      )
      .sort({ pokedexId: 1 })
      .limit(limit)
      .toArray();

    return c.json({
      count: pokemon.length,
      items: pokemon,
    });
  } catch (error) {
    const response = toErrorResponse(error);
    return c.json(response.body, response.status as 400 | 403 | 404 | 409 | 500);
  }
});

app.get("/users/:userId/profile", async (c) => {
  try {
    const userId = c.req.param("userId").trim();
    if (!userId) {
      return c.json({ error: { code: "INVALID_ACTION", message: "userId requerido." } }, 400);
    }
    const user = await fetchUserProfile(userId);
    return c.json({
      userId: user.userId,
      displayName: user.displayName,
      shinyUnlocked: user.shinyUnlocked,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    const response = toErrorResponse(error);
    return c.json(response.body, response.status as 400 | 403 | 404 | 409 | 500);
  }
});

const checkoutSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().optional().nullable(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

app.post("/payments/checkout", async (c) => {
  try {
    if (!isStripeEnabled()) {
      return c.json(
        { error: { code: "STRIPE_DISABLED", message: "Stripe no está habilitado en este servidor." } },
        503,
      );
    }
    const payload = checkoutSchema.parse(await c.req.json());
    const session = await createShinyCheckoutSession({
      userId: payload.userId,
      displayName: payload.displayName ?? null,
      successUrl: payload.successUrl,
      cancelUrl: payload.cancelUrl,
    });
    return c.json(session);
  } catch (error) {
    const response = toErrorResponse(error);
    return c.json(response.body, response.status as 400 | 403 | 404 | 409 | 500);
  }
});

app.post("/payments/confirm", async (c) => {
  try {
    const payload = z.object({ sessionId: z.string().min(1) }).parse(await c.req.json());
    await handleCheckoutCompleted(payload.sessionId);
    return c.json({ ok: true });
  } catch (error) {
    const response = toErrorResponse(error);
    return c.json(response.body, response.status as 400 | 403 | 404 | 409 | 500);
  }
});

app.post("/payments/webhook", async (c) => {
  try {
    if (!isStripeEnabled()) {
      return c.json(
        { error: { code: "STRIPE_DISABLED", message: "Stripe no está habilitado." } },
        503,
      );
    }
    const signature = c.req.header("stripe-signature");
    const rawBody = await c.req.text();
    if (!env.STRIPE_WEBHOOK_SECRET || !signature) {
      return c.json(
        {
          error: {
            code: "INVALID_ACTION",
            message: "Webhook firmado requerido (configura STRIPE_WEBHOOK_SECRET).",
          },
        },
        400,
      );
    }
    const stripe = getStripeClient();
    const event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as { id: string };
      await handleCheckoutCompleted(session.id);
    }
    return c.json({ received: true });
  } catch (error) {
    const response = toErrorResponse(error);
    return c.json(response.body, response.status as 400 | 403 | 404 | 409 | 500);
  }
});

void getDb()
  .then(() => console.log("MongoDB connected"))
  .catch((err: unknown) => console.error("MongoDB connect error:", err instanceof Error ? err.message : err));

export default {
  port: env.API_PORT,
  fetch: app.fetch,
};

