import Stripe from "stripe";
import {
  listInventory,
  listOrders,
  listOrdersByBuyer,
  listPendingOrders,
  OrderStatus,
  updateInventory,
  updateOrderStatus,
  upsertOrderFromCheckout,
} from "./db";

const port = Number(process.env.API_PORT || 4000);
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const processedEvents = new Set<string>();

function getCorsHeaders(origin: string | null) {
  const safeOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": safeOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Stripe-Signature",
  };
}

function jsonResponse(body: unknown, options: { status?: number; origin?: string | null } = {}) {
  return new Response(JSON.stringify(body), {
    status: options.status ?? 200,
    headers: getCorsHeaders(options.origin ?? null),
  });
}

const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
const stripeClient = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: "2026-03-25.dahlia" })
  : null;

const productsById = {
  "kit-balcon-basico": {
    id: "kit-balcon-basico",
    name: "Kit Balcón Básico",
    description: "Lechuga + cilantro + cebollín para espacios con 2-3 horas de luz.",
    priceUsd: 24.9,
  },
  "kit-microverde-rapido": {
    id: "kit-microverde-rapido",
    name: "Kit Microverde Rápido",
    description: "Microbrotes listos en 7-10 días, ideal para cocina en apartamentos.",
    priceUsd: 29.9,
  },
  "kit-aromaticas-compacto": {
    id: "kit-aromaticas-compacto",
    name: "Kit Aromáticas Compacto",
    description: "Albahaca + menta + perejil con guía de poda y riego urbano.",
    priceUsd: 34.9,
  },
} as const;

async function refreshPendingOrdersWithStripe() {
  if (!stripeClient) return;

  const pendingOrders = listPendingOrders();
  for (const order of pendingOrders) {
    try {
      const session = await stripeClient.checkout.sessions.retrieve(order.checkoutSessionId);
      const syncedStatus: OrderStatus =
        session.payment_status === "paid" || session.status === "complete"
          ? "paid"
          : session.status === "expired"
            ? "cancelled"
            : "pending";

      upsertOrderFromCheckout({
        checkoutSessionId: session.id,
        productId: session.metadata?.productId ?? order.productId,
        buyerId: session.metadata?.buyerId ?? order.buyerId,
        status: syncedStatus,
        amountUsd: (session.amount_total ?? 0) / 100 || order.amountUsd,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Stripe sync error";
      console.warn(`[orders-sync] checkout ${order.checkoutSessionId}: ${message}`);
    }
  }
}

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    const origin = req.headers.get("origin");

    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(origin),
      });
    }

    if (req.method === "GET" && url.pathname === "/health") {
      return jsonResponse(
        {
          ok: true,
          service: "urbansprout-bun-api",
          db: process.env.BUN_DB_PATH?.trim() || "./data/urbansprout.sqlite",
        },
        { origin },
      );
    }

    if (req.method === "POST" && url.pathname === "/api/checkout") {
      if (!stripeClient) {
        return jsonResponse(
          { error: "Configura STRIPE_SECRET_KEY para habilitar checkout." },
          { status: 503, origin },
        );
      }

      const body = (await req.json()) as {
        productId?: string;
        userId?: string | null;
        userEmail?: string | null;
      };

      const selectedProduct =
        body.productId && body.productId in productsById
          ? productsById[body.productId as keyof typeof productsById]
          : null;
      if (!selectedProduct) {
        return jsonResponse({ error: "Producto no válido." }, { status: 400, origin });
      }

      const storefrontUrl = process.env.APP_URL?.trim() || "http://localhost:3000";
      const normalizedEmail = body.userEmail?.trim().toLowerCase() || undefined;
      const buyerId = body.userId?.trim() || `guest-${Date.now()}`;

      try {
        const session = await stripeClient.checkout.sessions.create({
          mode: "payment",
          success_url: `${storefrontUrl}/dashboard?payment=success`,
          cancel_url: `${storefrontUrl}/dashboard?payment=cancelled`,
          customer_email: normalizedEmail,
          metadata: {
            productId: selectedProduct.id,
            buyerId,
          },
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: "usd",
                unit_amount: Math.round(selectedProduct.priceUsd * 100),
                product_data: {
                  name: selectedProduct.name,
                  description: selectedProduct.description,
                },
              },
            },
          ],
        });

        upsertOrderFromCheckout({
          checkoutSessionId: session.id,
          productId: selectedProduct.id,
          buyerId,
          status: "pending",
          amountUsd: selectedProduct.priceUsd,
        });

        return jsonResponse({ checkoutUrl: session.url }, { origin });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Error al crear la sesión de Stripe.";
        return jsonResponse({ error: message }, { status: 500, origin });
      }
    }

    if (req.method === "GET" && url.pathname === "/orders") {
      await refreshPendingOrdersWithStripe();
      const buyerId = url.searchParams.get("buyerId")?.trim();
      const data = buyerId ? listOrdersByBuyer(buyerId) : listOrders();
      return jsonResponse({ data }, { origin });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/orders/")) {
      const orderId = url.pathname.split("/").at(-1);
      if (!orderId) {
        return jsonResponse({ error: "ID de orden inválido." }, { status: 400, origin });
      }

      const body = (await req.json()) as { status?: OrderStatus };
      if (!body.status || !["pending", "paid", "cancelled"].includes(body.status)) {
        return jsonResponse({ error: "Estado de orden inválido." }, { status: 400, origin });
      }

      updateOrderStatus(orderId, body.status);
      return jsonResponse({ ok: true }, { origin });
    }

    if (req.method === "GET" && url.pathname === "/inventory") {
      return jsonResponse({ data: listInventory() }, { origin });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/inventory/")) {
      const sku = decodeURIComponent(url.pathname.split("/").at(-1) || "");
      if (!sku) {
        return jsonResponse({ error: "SKU inválido." }, { status: 400, origin });
      }

      const body = (await req.json()) as { stock?: number; minimumStock?: number };
      if (typeof body.stock !== "number" || typeof body.minimumStock !== "number") {
        return jsonResponse({ error: "Stock y mínimo son requeridos." }, { status: 400, origin });
      }

      updateInventory({ sku, stock: body.stock, minimumStock: body.minimumStock });
      return jsonResponse({ ok: true }, { origin });
    }

    if (req.method === "POST" && url.pathname === "/webhooks/stripe") {
      if (!stripeClient || !stripeWebhookSecret) {
        return jsonResponse(
          { error: "Configura STRIPE_SECRET_KEY y STRIPE_WEBHOOK_SECRET para webhooks." },
          { status: 503, origin },
        );
      }

      const signature = req.headers.get("stripe-signature");
      if (!signature) {
        return jsonResponse({ error: "Falta Stripe-Signature." }, { status: 400, origin });
      }

      const payload = await req.text();
      let event: Stripe.Event;

      try {
        event = stripeClient.webhooks.constructEvent(payload, signature, stripeWebhookSecret);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Firma inválida de Stripe.";
        return jsonResponse({ error: message }, { status: 400, origin });
      }

      if (processedEvents.has(event.id)) {
        return jsonResponse({ ok: true, deduplicated: true }, { origin });
      }
      processedEvents.add(event.id);

      if (event.type === "checkout.session.completed" || event.type === "checkout.session.expired") {
        const session = event.data.object as Stripe.Checkout.Session;
        upsertOrderFromCheckout({
          checkoutSessionId: session.id,
          productId: session.metadata?.productId ?? "unknown-product",
          buyerId: session.metadata?.buyerId ?? "unknown-buyer",
          status: event.type === "checkout.session.completed" ? "paid" : "cancelled",
          amountUsd: (session.amount_total ?? 0) / 100,
        });
      }

      return jsonResponse({ ok: true }, { origin });
    }

    return jsonResponse({ error: "Ruta no encontrada." }, { status: 404, origin });
  },
});

console.log(`UrbanSprout Bun API running on http://localhost:${port}`);
