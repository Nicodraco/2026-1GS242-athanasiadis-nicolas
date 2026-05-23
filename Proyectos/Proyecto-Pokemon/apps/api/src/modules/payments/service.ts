import type { Db } from "mongodb";

import { env } from "../../config/env";
import { getDb } from "../../lib/mongodb";
import { getStripeClient, isStripeEnabled } from "./stripe-client";
import {
  getOrCreateUser,
  setShinyUnlocked,
  type UserDocument,
} from "./user.model";

export class PaymentsError extends Error {
  code: "STRIPE_DISABLED" | "INVALID_ACTION" | "USER_NOT_FOUND" | "STRIPE_ERROR";

  constructor(code: PaymentsError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

export type CreateCheckoutInput = {
  userId: string;
  displayName?: string | null;
  successUrl?: string;
  cancelUrl?: string;
};

const getWebPublicUrl = (): string => env.WEB_PUBLIC_URL ?? "http://localhost:3000";

export const fetchUserProfile = async (
  userId: string,
  dbArg?: Db,
): Promise<UserDocument> => {
  if (!userId.trim()) {
    throw new PaymentsError("INVALID_ACTION", "userId requerido.");
  }
  const db = dbArg ?? (await getDb());
  return getOrCreateUser(db, userId);
};

export const createShinyCheckoutSession = async (
  input: CreateCheckoutInput,
  dbArg?: Db,
): Promise<{ url: string; sessionId: string }> => {
  if (!isStripeEnabled()) {
    throw new PaymentsError("STRIPE_DISABLED", "Stripe no está configurado en el servidor.");
  }

  if (!input.userId.trim()) {
    throw new PaymentsError("INVALID_ACTION", "userId requerido.");
  }

  const db = dbArg ?? (await getDb());
  const user = await getOrCreateUser(db, input.userId, input.displayName ?? null);
  const stripe = getStripeClient();
  const webBase = getWebPublicUrl();

  const lineItem = env.STRIPE_SHINY_PRODUCT_ID
    ? {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: env.STRIPE_SHINY_PRICE_USD_CENTS,
          product: env.STRIPE_SHINY_PRODUCT_ID,
        },
      }
    : {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: env.STRIPE_SHINY_PRICE_USD_CENTS,
          product_data: {
            name: "Pack Shiny - Pokemon Battle Rooms",
            description: "Desbloquea sprites shiny para tus Pokémon en batalla.",
          },
        },
      };

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [lineItem],
    customer: user.stripeCustomerId ?? undefined,
    customer_email: user.stripeCustomerId ? undefined : undefined,
    client_reference_id: user.userId,
    metadata: {
      userId: user.userId,
      product: "shiny-pack",
    },
    success_url: input.successUrl ?? `${webBase}/shop?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: input.cancelUrl ?? `${webBase}/shop?status=cancel`,
  });

  if (!session.url) {
    throw new PaymentsError("STRIPE_ERROR", "Stripe no devolvió URL de checkout.");
  }

  return { url: session.url, sessionId: session.id };
};

export const handleCheckoutCompleted = async (
  sessionId: string,
  dbArg?: Db,
): Promise<void> => {
  if (!isStripeEnabled()) {
    throw new PaymentsError("STRIPE_DISABLED", "Stripe no está configurado.");
  }

  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const userId = session.metadata?.userId ?? session.client_reference_id ?? null;
  if (!userId) {
    throw new PaymentsError("INVALID_ACTION", "Sesión Stripe sin userId asociado.");
  }

  const db = dbArg ?? (await getDb());
  await getOrCreateUser(db, userId);
  const stripeCustomerId = typeof session.customer === "string" ? session.customer : null;
  await setShinyUnlocked(db, userId, session.id, stripeCustomerId);
};

export const paymentsModule = {
  name: "payments",
};
