import Stripe from "stripe";
import {
  closeCheckoutAttempt,
  createCheckoutAttempt,
  createProduct,
  deleteProduct,
  getProductById,
  listInventory,
  listOrders,
  listPendingOrders,
  listProducts,
  OrderStatus,
  productHasOrders,
  updateProduct,
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
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isValidStock(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

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

      if (syncedStatus === "pending") continue;

      upsertOrderFromCheckout({
        checkoutSessionId: session.id,
        productId: session.metadata?.productId ?? order.productId,
        buyerId: session.metadata?.buyerId ?? order.buyerId,
        status: syncedStatus,
        amountUsd: (session.amount_total ?? 0) / 100 || order.amountUsd,
      });
      closeCheckoutAttempt(session.id);
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

      if (!isNonEmptyString(body.productId)) {
        return jsonResponse({ error: "Producto no válido." }, { status: 400, origin });
      }

      const selectedProduct = getProductById(body.productId.trim());
      if (!selectedProduct || !selectedProduct.isActive) {
        return jsonResponse({ error: "Producto no disponible para compra." }, { status: 400, origin });
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

        createCheckoutAttempt({
          checkoutSessionId: session.id,
          productId: selectedProduct.id,
          buyerId,
          amountUsd: selectedProduct.priceUsd,
        });

        return jsonResponse({ checkoutUrl: session.url }, { origin });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Error al crear la sesión de Stripe.";
        return jsonResponse({ error: message }, { status: 500, origin });
      }
    }

    if (req.method === "GET" && url.pathname === "/products") {
      const includeInactive = url.searchParams.get("includeInactive") === "1";
      return jsonResponse({ data: listProducts({ includeInactive }) }, { origin });
    }

    if (req.method === "POST" && url.pathname === "/products") {
      const body = (await req.json()) as {
        id?: string;
        name?: string;
        description?: string;
        priceUsd?: number;
        tag?: string;
        stock?: number;
        minimumStock?: number;
        isActive?: boolean;
      };

      if (!isNonEmptyString(body.id) || !/^[a-z0-9-]+$/.test(body.id.trim())) {
        return jsonResponse(
          { error: "ID inválido. Usa minúsculas, números y guiones." },
          { status: 400, origin },
        );
      }

      if (!isNonEmptyString(body.name) || !isNonEmptyString(body.description) || !isNonEmptyString(body.tag)) {
        return jsonResponse({ error: "Nombre, descripción y tag son requeridos." }, { status: 400, origin });
      }

      if (!isValidPrice(body.priceUsd)) {
        return jsonResponse({ error: "El precio debe ser un número mayor o igual a 0." }, { status: 400, origin });
      }

      if (!isValidStock(body.stock) || !isValidStock(body.minimumStock)) {
        return jsonResponse({ error: "Stock y mínimo deben ser números >= 0." }, { status: 400, origin });
      }

      if (getProductById(body.id.trim())) {
        return jsonResponse({ error: "Ya existe un producto con ese ID." }, { status: 409, origin });
      }

      try {
        createProduct({
          id: body.id.trim(),
          name: body.name.trim(),
          description: body.description.trim(),
          priceUsd: body.priceUsd,
          tag: body.tag.trim(),
          stock: body.stock,
          minimumStock: body.minimumStock,
          isActive: body.isActive ?? true,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo crear el producto.";
        return jsonResponse({ error: message }, { status: 500, origin });
      }

      return jsonResponse({ ok: true }, { origin });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/products/")) {
      const productId = decodeURIComponent(url.pathname.split("/").at(-1) || "");
      if (!productId) {
        return jsonResponse({ error: "ID de producto inválido." }, { status: 400, origin });
      }

      const body = (await req.json()) as {
        name?: string;
        description?: string;
        priceUsd?: number;
        tag?: string;
        isActive?: boolean;
        stock?: number;
        minimumStock?: number;
      };

      if (body.name !== undefined && !isNonEmptyString(body.name)) {
        return jsonResponse({ error: "El nombre no puede ser vacío." }, { status: 400, origin });
      }
      if (body.description !== undefined && !isNonEmptyString(body.description)) {
        return jsonResponse({ error: "La descripción no puede ser vacía." }, { status: 400, origin });
      }
      if (body.tag !== undefined && !isNonEmptyString(body.tag)) {
        return jsonResponse({ error: "El tag no puede ser vacío." }, { status: 400, origin });
      }
      if (body.priceUsd !== undefined && !isValidPrice(body.priceUsd)) {
        return jsonResponse({ error: "El precio debe ser un número mayor o igual a 0." }, { status: 400, origin });
      }
      if (body.stock !== undefined && !isValidStock(body.stock)) {
        return jsonResponse({ error: "Stock inválido." }, { status: 400, origin });
      }
      if (body.minimumStock !== undefined && !isValidStock(body.minimumStock)) {
        return jsonResponse({ error: "Mínimo inválido." }, { status: 400, origin });
      }
      if (body.isActive !== undefined && typeof body.isActive !== "boolean") {
        return jsonResponse({ error: "isActive debe ser booleano." }, { status: 400, origin });
      }

      const updated = updateProduct(productId, {
        name: body.name?.trim(),
        description: body.description?.trim(),
        priceUsd: body.priceUsd,
        tag: body.tag?.trim(),
        isActive: body.isActive,
        stock: body.stock,
        minimumStock: body.minimumStock,
      });

      if (!updated) {
        return jsonResponse({ error: "Producto no encontrado." }, { status: 404, origin });
      }

      return jsonResponse({ ok: true }, { origin });
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/products/")) {
      const productId = decodeURIComponent(url.pathname.split("/").at(-1) || "");
      if (!productId) {
        return jsonResponse({ error: "ID de producto inválido." }, { status: 400, origin });
      }

      if (productHasOrders(productId)) {
        return jsonResponse(
          { error: "No se puede eliminar un producto con órdenes históricas. Puedes desactivarlo." },
          { status: 409, origin },
        );
      }

      const deleted = deleteProduct(productId);
      if (!deleted) {
        return jsonResponse({ error: "Producto no encontrado." }, { status: 404, origin });
      }

      return jsonResponse({ ok: true }, { origin });
    }

    if (req.method === "GET" && url.pathname === "/orders") {
      await refreshPendingOrdersWithStripe();
      return jsonResponse({ data: listOrders() }, { origin });
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

      const updated = updateInventory({ sku, stock: body.stock, minimumStock: body.minimumStock });
      if (!updated) {
        return jsonResponse({ error: "SKU no encontrado." }, { status: 404, origin });
      }

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
        closeCheckoutAttempt(session.id);
      }

      return jsonResponse({ ok: true }, { origin });
    }

    return jsonResponse({ error: "Ruta no encontrada." }, { status: 404, origin });
  },
});

console.log(`UrbanSprout Bun API running on http://localhost:${port}`);
