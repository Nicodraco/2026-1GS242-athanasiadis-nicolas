import { useEffect, useState } from "react";
import { ShoppingBag, Clock, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { getApiUrl } from "@/lib/env";
import { productsById } from "@/lib/catalog";

type Order = {
  id: string;
  checkoutSessionId: string;
  productId: string;
  buyerId: string;
  status: "pending" | "paid" | "cancelled";
  amountUsd: number;
  createdAt: string;
  updatedAt: string;
};

const STATUS_CONFIG: Record<
  Order["status"],
  { label: string; Icon: React.ComponentType<{ size: number }>; cls: string }
> = {
  pending:   { label: "Pendiente",  Icon: Clock,         cls: "order-status-pending" },
  paid:      { label: "Pagado",     Icon: CheckCircle2,  cls: "order-status-paid" },
  cancelled: { label: "Cancelado",  Icon: XCircle,       cls: "order-status-cancelled" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function DashboardOrders({ userId }: { userId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    const apiUrl = getApiUrl();
    fetch(`${apiUrl}/orders?buyerId=${encodeURIComponent(userId)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Error al consultar órdenes.");
        return r.json() as Promise<{ data: Order[] }>;
      })
      .then((body) => setOrders(body.data))
      .catch(() => setError("No se pudieron cargar tus órdenes. Verifica que la API esté corriendo."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (userId) load();
    else setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (loading) {
    return (
      <div className="orders-loading">
        <RefreshCw size={18} className="spin" />
        <span>Cargando tus órdenes…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="orders-error">
        <p className="status-error">{error}</p>
        <button className="button button-outline" type="button" onClick={load}>
          Reintentar
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="orders-empty">
        <div className="orders-empty-icon">
          <ShoppingBag size={28} />
        </div>
        <p className="orders-empty-title">Todavía no tienes compras</p>
        <p className="orders-empty-sub">Cuando completes un pago aparecerán aquí.</p>
        <a href="/#catalogo" className="button button-primary">
          Ver catálogo
        </a>
      </div>
    );
  }

  return (
    <div className="orders-list">
      {orders.map((order) => {
        const product = productsById[order.productId as keyof typeof productsById];
        const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
        const { Icon, label, cls } = cfg;

        return (
          <div className="order-card" key={order.id}>
            <div className="order-card-left">
              <div className="order-icon">
                <ShoppingBag size={16} />
              </div>
              <div>
                <p className="order-name">{product?.name ?? order.productId}</p>
                <p className="order-date">{formatDate(order.createdAt)}</p>
              </div>
            </div>
            <div className="order-card-right">
              <span className={`order-status ${cls}`}>
                <Icon size={11} />
                {label}
              </span>
              <span className="order-amount">${order.amountUsd.toFixed(2)} USD</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
