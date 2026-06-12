import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { connectDB, getDB } from './db';


const PORT = Number(process.env.PORT) || 4005;

const app = new Hono();
app.use('/*', cors());

app.get('/health', (c) => c.json({ ok: true, service: 'ranking' }));

app.post('/ranking/record', async (c) => {
  const { userId, username, movesCount, won, gameId } = await c.req.json();
  if (!won) return c.json({ recorded: false });
  if (!userId || !username || !Number.isInteger(movesCount)) {
    return c.json({ error: 'userId, username y movesCount son requeridos' }, 400);
  }
  const db = getDB();
  await db.collection('rankings').insertOne({
    userId, username, movesCount, gameId: gameId ?? null, createdAt: new Date(),
  } as any);
  return c.json({ recorded: true }, 201);
});

app.get('/ranking', async (c) => {
  const limit = Math.min(Math.max(Number(c.req.query('limit')) || 20, 1), 100);
  const db = getDB();
  const rankings = await db.collection('rankings')
    .find()
    .sort({ movesCount: 1, createdAt: -1 } as any)
    .limit(limit)
    .toArray();
  return c.json({
    ranking: rankings.map(r => ({
      user_id: r.userId, username: r.username,
      moves_count: r.movesCount, game_id: r.gameId, created_at: r.createdAt,
    })),
  });
});

async function start() {
  await connectDB();
  console.log(`[ranking] listening on :${PORT}`);
  Bun.serve({ port: PORT, fetch: app.fetch });
}

start().catch(console.error);
