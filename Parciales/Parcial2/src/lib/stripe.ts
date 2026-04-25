import Stripe from "stripe";

let stripeClient: Stripe | null = null;

function getStripeClient() {
  if (stripeClient) {
    return stripeClient;
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error("Falta STRIPE_SECRET_KEY en variables de entorno.");
  }

  stripeClient = new Stripe(stripeSecretKey, {
    apiVersion: "2026-03-25.dahlia",
  });

  return stripeClient;
}

export class InternalStripeSDK {
  static async createCheckoutSession(params: {
    productName: string;
    productDescription: string;
    unitAmount: number;
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string | null;
    metadata?: Record<string, string>;
  }) {
    const stripe = getStripeClient();

    return stripe.checkout.sessions.create({
      mode: "payment",
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      customer_email: params.customerEmail ?? undefined,
      metadata: params.metadata,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: params.unitAmount,
            product_data: {
              name: params.productName,
              description: params.productDescription,
            },
          },
        },
      ],
    });
  }
}
