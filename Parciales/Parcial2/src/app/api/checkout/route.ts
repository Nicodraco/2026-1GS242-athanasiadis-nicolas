import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { productsById } from "@/lib/catalog";
import { isClerkConfigured, isStripeConfigured } from "@/lib/env";
import { getSessionEmail } from "@/lib/roles";
import { InternalStripeSDK } from "@/lib/stripe";

export async function POST(request: Request) {
  if (!isClerkConfigured()) {
    return NextResponse.json(
      { error: "Configura Clerk para habilitar compras autenticadas." },
      { status: 503 },
    );
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Configura Stripe para habilitar checkout." },
      { status: 503 },
    );
  }

  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Debes iniciar sesión para comprar." }, { status: 401 });
  }

  const body = (await request.json()) as { productId?: string };
  if (!body.productId || !productsById[body.productId]) {
    return NextResponse.json({ error: "Producto no válido." }, { status: 400 });
  }

  const selectedProduct = productsById[body.productId];
  const host = request.headers.get("origin") ?? process.env.APP_URL ?? "http://localhost:3000";
  const user = await currentUser();

  try {
    const session = await InternalStripeSDK.createCheckoutSession({
      productName: selectedProduct.name,
      productDescription: selectedProduct.description,
      unitAmount: Math.round(selectedProduct.priceUsd * 100),
      successUrl: `${host}/dashboard?payment=success`,
      cancelUrl: `${host}/dashboard?payment=cancelled`,
      customerEmail:
        getSessionEmail(sessionClaims) ??
        user?.primaryEmailAddress?.emailAddress?.toLowerCase() ??
        undefined,
      metadata: {
        productId: selectedProduct.id,
        buyerId: userId,
      },
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al crear la sesión de Stripe.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
