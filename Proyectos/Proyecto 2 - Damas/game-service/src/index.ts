import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Server as SocketServer } from 'socket.io';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { verify } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { connectDB, getDB } from './db';

import {
  AI_USER_ID, AI_USERNAME, BroadcastState, GameState,
  aiRequestFor, applyPlayerMove, buildInitialState,
  expectedUserIdForTurn, rankingPayloadFor, toBroadcast,
} from './gameLogic';

const PORT = Number(process.env.PORT) || 4002;
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:4003';
const RANKING_SERVICE_URL = process.env.RANKING_SERVICE_URL || 'http://ranking-service:4005';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

let io: SocketServer;

interface JwtPayload {
  userId: string;
  username: string;
}

function verifyToken(token: string | null): JwtPayload | null {
  if (!token) return null;
  try {
    const payload = verify(token, JWT_SECRET) as { sub: string };
    return { userId: payload.sub, username: '' };
  } catch {
    return null;
  }
}

async function enrichUser(payload: JwtPayload): Promise<JwtPayload | null> {
  const db = getDB();
  const user = await db.collection('users').findOne({ _id: payload.userId } as any);
  if (!user) return null;
  return { userId: user._id as unknown as string, username: (user as any).username };
}

function getBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

interface AiResp {
  from: [number, number];
  to: [number, number];
}

async function askAi(game: GameState): Promise<AiResp> {
  const res = await fetch(`${AI_SERVICE_URL}/ai/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(aiRequestFor(game)),
  });
  if (!res.ok) throw new Error(`ai-service ${res.status}`);
  return res.json() as Promise<AiResp>;
}

async function postRanking(game: GameState): Promise<void> {
  const payload = rankingPayloadFor(game);
  if (!payload) return;
  try {
    await fetch(`${RANKING_SERVICE_URL}/ranking/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('[game] ranking call failed:', err);
  }
}

async function persistGame(g: GameState): Promise<void> {
  const db = getDB();
  await db.collection('games').updateOne(
    { _id: g.id } as any,
    { $set: {
      board: g.board, currentPlayer: g.currentPlayer,
      mustContinueFrom: g.mustContinueFrom,
      movesP1: g.movesP1, movesP2: g.movesP2, movesCount: g.movesCount,
      status: g.status, winnerId: g.winnerId,
    }}
  );
}

async function loadGame(id: string): Promise<GameState | null> {
  const db = getDB();
  const doc = await db.collection('games').findOne({ _id: id } as any);
  if (!doc) return null;
  return {
    id: doc._id as unknown as string, player1Id: doc.player1Id, player1Username: doc.player1Username,
    player2Id: doc.player2Id, player2Username: doc.player2Username,
    isVsAi: doc.isVsAi, status: doc.status, board: doc.board,
    currentPlayer: doc.currentPlayer, mustContinueFrom: doc.mustContinueFrom,
    movesP1: doc.movesP1, movesP2: doc.movesP2, movesCount: doc.movesCount,
    winnerId: doc.winnerId,
  };
}

async function runAiTurn(gameId: string): Promise<void> {
  for (let safety = 0; safety < 20; safety++) {
    const game = await loadGame(gameId);
    if (!game || game.status !== 'active') return;
    if (!game.isVsAi || game.currentPlayer !== 'black') return;
    let aiMove: AiResp;
    try { aiMove = await askAi(game); }
    catch (err) { console.error('[game] ai-service failed:', err); return; }
    const outcome = applyPlayerMove(game, aiMove.from, aiMove.to);
    if ('error' in outcome) { console.error('[game] AI illegal move:', outcome.error); return; }
    if (outcome.finished && outcome.game.winnerId === null) outcome.game.winnerId = AI_USER_ID;
    await persistGame(outcome.game);
    io.to(`game:${gameId}`).emit('game_state', toBroadcast(outcome.game));
    if (outcome.finished) {
      io.to(`game:${gameId}`).emit('game_over', {
        gameId,
        winnerId: outcome.game.winnerId,
        winnerUsername: outcome.game.winnerId === AI_USER_ID ? AI_USERNAME : toBroadcast(outcome.game).winnerUsername,
        movesCount: outcome.game.winnerId === outcome.game.player1Id
          ? outcome.game.movesP1 : outcome.game.movesP2,
      });
      await postRanking(outcome.game);
      return;
    }
    if (outcome.turnEnded) return;
    await new Promise((r) => setTimeout(r, 400));
  }
}

// ---------- HTTP ----------

const app = new Hono();
app.use('/health', cors());
app.use('/game', cors());
app.use('/game/*', cors());

app.get('/health', (c) => c.json({ ok: true, service: 'game' }));

app.post('/game', async (c) => {
  const token = getBearerToken(c.req.header('Authorization'));
  const payload = verifyToken(token);
  if (!payload) return c.json({ error: 'Token requerido' }, 401);
  const enriched = await enrichUser(payload);
  if (!enriched) return c.json({ error: 'Usuario no encontrado' }, 401);
  const vsAi = Boolean((await c.req.json()).vsAi);
  const gameId = uuidv4();
  const seed = buildInitialState(gameId, enriched.userId, enriched.username, vsAi);
  const db = getDB();
  await db.collection('games').insertOne({
    _id: gameId, player1Id: seed.player1Id, player1Username: seed.player1Username,
    player2Id: seed.player2Id, player2Username: seed.player2Username,
    isVsAi: seed.isVsAi, status: seed.status, board: seed.board,
    currentPlayer: seed.currentPlayer, mustContinueFrom: seed.mustContinueFrom,
    movesP1: seed.movesP1, movesP2: seed.movesP2, movesCount: seed.movesCount,
    winnerId: seed.winnerId,
  } as any);
  return c.json({ gameId }, 201);
});

app.get('/game/:id', async (c) => {
  const game = await loadGame(c.req.param('id'));
  if (!game) return c.json({ error: 'Partida no encontrada' }, 404);
  return c.json(toBroadcast(game));
});

app.post('/game/:id/join', async (c) => {
  const token = getBearerToken(c.req.header('Authorization'));
  const payload = verifyToken(token);
  if (!payload) return c.json({ error: 'Token requerido' }, 401);
  const enriched = await enrichUser(payload);
  if (!enriched) return c.json({ error: 'Usuario no encontrado' }, 401);
  const game = await loadGame(c.req.param('id'));
  if (!game) return c.json({ error: 'Partida no encontrada' }, 404);
  if (game.isVsAi) return c.json({ error: 'Esta partida es contra la IA' }, 400);
  if (game.status !== 'waiting') return c.json({ error: 'La partida ya tiene dos jugadores' }, 409);
  if (game.player1Id === enriched.userId) return c.json({ error: 'Ya estas en esta partida' }, 400);
  const db = getDB();
  await db.collection('games').updateOne(
    { _id: game.id } as any,
    { $set: { player2Id: enriched.userId, player2Username: enriched.username, status: 'active' } }
  );
  const updated = await loadGame(game.id);
  if (updated) io.to(`game:${game.id}`).emit('game_state', toBroadcast(updated));
  return c.json({ joined: true });
});

// ---------- WebSocket ----------

async function start() {
  await connectDB();

  // Convert Hono fetch handler to Node.js request/response handler
  const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) {
        if (v) headers.set(k, Array.isArray(v) ? v.join(', ') : v);
      }

      let body: ReadableStream | undefined;
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        body = new ReadableStream({
          start(controller) {
            req.on('data', (chunk: Buffer) => controller.enqueue(chunk));
            req.on('end', () => controller.close());
          },
        });
      }

      const request = new Request(url.toString(), {
        method: req.method,
        headers,
        body,
      });

      const response = await app.fetch(request);
      res.statusCode = response.status;
      response.headers.forEach((value, key) => res.setHeader(key, value));

      if (response.body) {
        const reader = response.body.getReader();
        const pump = async () => {
          try {
            const { done, value } = await reader.read();
            if (done) { res.end(); return; }
            res.write(value);
            pump();
          } catch (e) {
            if (!res.writableEnded) res.end();
          }
        };
        pump();
      } else {
        res.end();
      }
    } catch (err) {
      console.error('[game] HTTP error:', err);
      if (!res.writableEnded) res.end();
    }
  });

  io = new SocketServer(httpServer, { cors: { origin: '*' } });

  io.on('connection', (socket) => {
    socket.on('join_game', async ({ gameId, token }: { gameId: string; token?: string }, ack?: (r: unknown) => void) => {
      const game = await loadGame(gameId);
      if (!game) { ack?.({ ok: false, error: 'Partida no encontrada' }); return; }
      const payload = verifyToken(token ?? null);
      let enriched: JwtPayload | null = null;
      if (payload) enriched = await enrichUser(payload);
      let role: 'player1' | 'player2' | 'spectator' = 'spectator';
      if (enriched) {
        if (enriched.userId === game.player1Id) role = 'player1';
        else if (enriched.userId === game.player2Id) role = 'player2';
      }
      socket.join(`game:${gameId}`);
      ack?.({ ok: true, role, state: toBroadcast(game) });
      socket.emit('game_state', toBroadcast(game));
    });

    socket.on('move', async (
      { gameId, from, to, token }:
      { gameId: string; from: [number, number]; to: [number, number]; token?: string },
      ack?: (r: unknown) => void
    ) => {
      const payload = verifyToken(token ?? null);
      if (!payload) { ack?.({ ok: false, error: 'Token invalido' }); return; }
      const enriched = await enrichUser(payload);
      if (!enriched) { ack?.({ ok: false, error: 'Usuario no encontrado' }); return; }
      const game = await loadGame(gameId);
      if (!game) { ack?.({ ok: false, error: 'Partida no encontrada' }); return; }
      const expected = expectedUserIdForTurn(game);
      if (expected !== enriched.userId) { ack?.({ ok: false, error: 'No es tu turno' }); return; }
      const result = applyPlayerMove(game, from, to);
      if ('error' in result) { ack?.({ ok: false, error: result.error }); return; }
      await persistGame(result.game);
      io.to(`game:${gameId}`).emit('game_state', toBroadcast(result.game));
      ack?.({ ok: true });
      if (result.finished) {
        io.to(`game:${gameId}`).emit('game_over', {
          gameId, winnerId: result.game.winnerId,
          winnerUsername: toBroadcast(result.game).winnerUsername,
          movesCount: result.game.winnerId === result.game.player1Id
            ? result.game.movesP1 : result.game.movesP2,
        });
        await postRanking(result.game);
        return;
      }
      if (result.game.isVsAi && result.game.currentPlayer === 'black') {
        void runAiTurn(result.game.id);
      }
    });
  });

  httpServer.listen(PORT, () => console.log(`[game] listening on :${PORT}`));
}

start().catch(console.error);
