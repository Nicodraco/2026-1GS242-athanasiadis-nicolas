import { Hono } from 'hono';
import { cors } from 'hono/cors';
import Stripe from 'stripe';
import { verify } from 'jsonwebtoken';
import { connectDB, getDB, seedSkins } from './db';


const PORT = Number(process.env.PORT) || 4004;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_...';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_...';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const stripe = new Stripe(STRIPE_SECRET_KEY);

interface JwtPayload { userId: string; username: string; }

function verifyToken(token: string | null): JwtPayload | null {
  if (!token) return null;
  try {
    const payload = verify(token, JWT_SECRET) as { sub: string };
    return { userId: payload.sub, username: '' };
  } catch { return null; }
}

function getBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

const app = new Hono();

app.post('/marketplace/webhook', async (c) => {
  const rawBody = await c.req.text();
  const sig = c.req.header('stripe-signature');
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig!, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    return c.text(`Webhook Error: ${err.message}`, 400);
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const userId = session.metadata?.userId;
    const itemId = session.metadata?.itemId;
    if (userId && itemId) {
      const db = getDB();
      await db.collection('user_skins').insertOne({ userId, skinId: Number(itemId), acquiredAt: new Date() } as any);
    }
  }
  return c.json({ received: true });
});

app.use('/*', cors());
app.use('/*', async (c, next) => {
  if (c.req.path === '/marketplace/webhook') return next();
  await next();
});

app.get('/health', (c) => c.json({ ok: true, service: 'marketplace' }));

app.get('/marketplace/items', async (c) => {
  const db = getDB();
  const items = await db.collection('skins').find().sort({ price: 1, id: 1 } as any).toArray();
  return c.json({ items: items.map(i => ({ id: i.id, name: i.name, description: i.description, price: i.price, image_url: i.image_url, type: 'skin' })) });
});

app.get('/marketplace/user/:userId/items', async (c) => {
  const userId = c.req.param('userId');
  const db = getDB();
  const userSkins = await db.collection('user_skins').find({ userId } as any).toArray();
  const skinIds = userSkins.map(us => us.skinId);
  const items = skinIds.length > 0
    ? await db.collection('skins').find({ id: { $in: skinIds } } as any).toArray()
    : [];
  return c.json({ items: items.map(i => ({ id: i.id, name: i.name, description: i.description, price: i.price, image_url: i.image_url, type: 'skin' })) });
});

app.patch('/marketplace/user/active-skin', async (c) => {
  const token = getBearerToken(c.req.header('Authorization'));
  const payload = verifyToken(token);
  if (!payload) return c.json({ error: 'Token invalido' }, 401);
  const { skinId } = await c.req.json();
  if (skinId !== null && typeof skinId !== 'number') return c.json({ error: 'skinId invalido' }, 400);
  const db = getDB();
  await db.collection('users').updateOne(
    { _id: payload.userId } as any,
    { $set: { activeSkinId: skinId ?? null } }
  );
  return c.json({ success: true });
});

app.post('/marketplace/create-checkout-session', async (c) => {
  const token = getBearerToken(c.req.header('Authorization'));
  const payload = verifyToken(token);
  if (!payload) return c.json({ error: 'Token requerido' }, 401);
  const { itemId } = await c.req.json();
  const db = getDB();
  const item = await db.collection('skins').findOne({ id: itemId } as any);
  if (!item) return c.json({ error: 'Item no encontrado' }, 404);
  if ((item as any).price === 0) {
    await db.collection('user_skins').updateOne(
      { userId: payload.userId, skinId: itemId } as any,
      { $setOnInsert: { userId: payload.userId, skinId: itemId, acquiredAt: new Date() } },
      { upsert: true }
    );
    return c.json({ success: true, message: 'Item adquirido' });
  }
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: (item as any).name, description: (item as any).description || undefined },
        unit_amount: (item as any).price,
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${FRONTEND_URL}/marketplace?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${FRONTEND_URL}/marketplace?canceled=true`,
    metadata: { userId: payload.userId, itemId: itemId.toString() },
  });
  await db.collection('pending_purchases').insertOne({
    sessionId: session.id, userId: payload.userId, itemId,
    status: 'pending', createdAt: new Date(),
  } as any);
  console.log(`[marketplace] pending purchase: user=${payload.userId} item=${itemId} session=${session.id}`);
  return c.json({ url: session.url });
});

app.post('/marketplace/confirm-purchase', async (c) => {
  const token = getBearerToken(c.req.header('Authorization'));
  const payload = verifyToken(token);
  if (!payload) return c.json({ error: 'Token requerido' }, 401);
  const { sessionId } = await c.req.json();
  if (!sessionId) return c.json({ error: 'sessionId requerido' }, 400);
  const db = getDB();
  const pending = await db.collection('pending_purchases').findOne({ sessionId } as any);
  if (!pending) return c.json({ error: 'No se encontro la compra' }, 404);
  if ((pending as any).userId !== payload.userId) return c.json({ error: 'Esta compra no te pertenece' }, 403);
  const itemId = (pending as any).itemId;
  if ((pending as any).status === 'completed') {
    return c.json({ success: true, message: 'Skin ya adquirida' });
  }
  await db.collection('user_skins').updateOne(
    { userId: payload.userId, skinId: Number(itemId) } as any,
    { $setOnInsert: { userId: payload.userId, skinId: Number(itemId), acquiredAt: new Date() } },
    { upsert: true }
  );
  await db.collection('pending_purchases').updateOne(
    { sessionId } as any, { $set: { status: 'completed' } }
  );
  console.log(`[marketplace] confirmed: user ${payload.userId} acquired skin ${itemId}`);
  return c.json({ success: true, message: 'Skin adquirida' });
});

async function start() {
  await connectDB();
  await seedSkins();
  console.log(`[marketplace] listening on :${PORT}`);
  Bun.serve({ port: PORT, fetch: app.fetch });
}

start().catch(console.error);
