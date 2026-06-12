import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { bestMove } from './search';
import type { Player } from './checkers';

const PORT = Number(process.env.PORT) || 4003;

const app = new Hono();
app.use('/*', cors());

app.get('/health', (c) => c.json({ ok: true, service: 'ai' }));

app.post('/ai/move', async (c) => {
  const body = await c.req.json();
  const { board, current_player, must_continue_from } = body as {
    board: string[][];
    current_player: Player;
    must_continue_from: [number, number] | null;
  };
  const move = bestMove(board, current_player, must_continue_from ?? null);
  if (!move) {
    return c.json({ error: 'No hay movimientos legales' }, 409);
  }
  return c.json({ from: move.from, to: move.to });
});

console.log(`[ai] listening on :${PORT}`);
Bun.serve({
  port: PORT,
  fetch: app.fetch,
});
