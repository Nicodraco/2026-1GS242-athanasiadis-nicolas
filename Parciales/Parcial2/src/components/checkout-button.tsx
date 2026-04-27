import { useState } from "react";
import { ShoppingBag } from "lucide-react";

type CheckoutButtonProps = {
  productId: string;
  userId: string | null;
  userEmail: string | null;
};

export function CheckoutButton({ productId, userId, userEmail }: CheckoutButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, userId, userEmail }),
      });

      const rawBody = await response.text();
      let parsed: { error?: string; checkoutUrl?: string } | null = null;
      try {
        parsed = JSON.parse(rawBody) as { error?: string; checkoutUrl?: string };
      } catch {
        parsed = null;
      }

      if (!response.ok) {
        throw new Error(parsed?.error ?? "No se pudo iniciar el checkout.");
      }
      if (!parsed?.checkoutUrl) {
        throw new Error("Stripe no devolvió una URL de checkout válida.");
      }

      window.location.href = parsed.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado en el checkout.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack">
      <button
        className="button button-primary button-block"
        type="button"
        onClick={handleCheckout}
        disabled={loading}
      >
        {loading ? (
          "Redirigiendo..."
        ) : (
          <>
            <ShoppingBag size={15} />
            Comprar kit
          </>
        )}
      </button>
      {error ? <p className="status-error">{error}</p> : null}
    </div>
  );
}
