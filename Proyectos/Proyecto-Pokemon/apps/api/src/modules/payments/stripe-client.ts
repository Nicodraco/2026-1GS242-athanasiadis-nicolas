import Stripe from "stripe";

import { env } from "../../config/env";

let stripeClient: Stripe | null = null;

export const getStripeClient = (): Stripe => {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY no está configurado. Agrégalo al .env.");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia" as Stripe.LatestApiVersion,
    });
  }

  return stripeClient;
};

export const isStripeEnabled = (): boolean => Boolean(env.STRIPE_SECRET_KEY);
