import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { connectDB, getDB } from './db';
import { hash, compare } from 'bcryptjs';
import { sign, verify } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';


const PORT = Number(process.env.PORT) || 4001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

const app = new Hono();
app.use('/*', cors());

function createToken(userId: string): string {
  return sign({ sub: userId }, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token: string): { userId: string; username: string } | null {
  try {
    const payload = verify(token, JWT_SECRET) as { sub: string };
    return { userId: payload.sub, username: '' };
  } catch {
    return null;
  }
}

function getBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

async function enrichUser(payload: { userId: string }): Promise<{ userId: string; username: string; email: string; activeSkinId: number | null } | null> {
  const db = getDB();
  const user = await db.collection('users').findOne({ _id: payload.userId } as any);
  if (!user) return null;
  return {
    userId: user._id as unknown as string,
    username: (user as any).username,
    email: (user as any).email,
    activeSkinId: (user as any).activeSkinId ?? null,
  };
}

app.post('/auth/register', async (c) => {
  const { username, email, password } = await c.req.json();
  if (!username || !email || !password) {
    return c.json({ error: 'username, email y password son requeridos' }, 400);
  }
  if (password.length < 4) {
    return c.json({ error: 'La contraseña debe tener al menos 4 caracteres' }, 400);
  }
  const db = getDB();
  const existing = await db.collection('users').findOne({
    $or: [{ email }, { username }],
  } as any);
  if (existing) {
    if ((existing as any).email === email) return c.json({ error: 'Email ya registrado' }, 409);
    return c.json({ error: 'Nombre de usuario ya registrado' }, 409);
  }
  const passwordHash = await hash(password, 10);
  const id = uuidv4();
  await db.collection('users').insertOne({
    _id: id, username, email, passwordHash, activeSkinId: null, createdAt: new Date(),
  } as any);
  const token = createToken(id);
  return c.json({
    token,
    user: { id, username, email, activeSkinId: null },
  }, 201);
});

app.post('/auth/login', async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) {
    return c.json({ error: 'email y password son requeridos' }, 400);
  }
  const db = getDB();
  const user = await db.collection('users').findOne({ email } as any);
  if (!user) return c.json({ error: 'Credenciales invalidas' }, 401);
  const valid = await compare(password, (user as any).passwordHash);
  if (!valid) return c.json({ error: 'Credenciales invalidas' }, 401);
  const token = createToken(user._id as unknown as string);
  return c.json({
    token,
    user: { id: user._id as unknown as string, username: (user as any).username, email: (user as any).email, activeSkinId: (user as any).activeSkinId ?? null },
  });
});

app.get('/auth/me', async (c) => {
  const token = getBearerToken(c.req.header('Authorization'));
  if (!token) return c.json({ error: 'Token requerido' }, 401);
  const payload = verifyToken(token);
  if (!payload) return c.json({ error: 'Token invalido' }, 401);
  const enriched = await enrichUser(payload);
  if (!enriched) return c.json({ error: 'Usuario no encontrado' }, 404);
  return c.json({ user: enriched });
});

app.patch('/auth/me/active-skin', async (c) => {
  const token = getBearerToken(c.req.header('Authorization'));
  if (!token) return c.json({ error: 'Token requerido' }, 401);
  const payload = verifyToken(token);
  if (!payload) return c.json({ error: 'Token invalido' }, 401);
  const { skinId } = await c.req.json();
  const db = getDB();
  await db.collection('users').updateOne(
    { _id: payload.userId } as any,
    { $set: { activeSkinId: skinId ?? null } }
  );
  return c.json({ success: true });
});

app.get('/health', (c) => c.json({ ok: true, service: 'auth' }));

async function start() {
  await connectDB();
  console.log(`[auth] listening on :${PORT}`);
  Bun.serve({ port: PORT, fetch: app.fetch });
}

start().catch(console.error);
