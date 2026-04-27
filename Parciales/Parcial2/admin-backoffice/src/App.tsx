import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { useEffect, useMemo, useState } from "react";
import "./App.css";

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

type InventoryItem = {
  sku: string;
  stock: number;
  minimumStock: number;
  updatedAt: string;
};

const ORDER_STATUSES: Order["status"][] = ["pending", "paid", "cancelled"];
const ORDER_STATUS_LABELS: Record<Order["status"], string> = {
  pending: "Pendiente (sin pago)",
  paid: "Pagada",
  cancelled: "Cancelada",
};

function App({ clerkEnabled }: { clerkEnabled: boolean }) {
  const apiBaseUrl = useMemo(() => import.meta.env.VITE_API_URL ?? "http://localhost:4000", []);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState<string | null>(null);
  const [savingSku, setSavingSku] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [ordersResponse, inventoryResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/orders`),
        fetch(`${apiBaseUrl}/inventory`),
      ]);

      if (!ordersResponse.ok || !inventoryResponse.ok) {
        throw new Error("No se pudo cargar la información del backoffice.");
      }

      const ordersBody = (await ordersResponse.json()) as { data: Order[] };
      const inventoryBody = (await inventoryResponse.json()) as { data: InventoryItem[] };
      setOrders(ordersBody.data);
      setInventory(inventoryBody.data);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : "Ocurrió un error desconocido cargando el backoffice.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function updateOrderStatus(orderId: string, status: Order["status"]) {
    setSavingOrder(orderId);
    try {
      const response = await fetch(`${apiBaseUrl}/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error("No se pudo actualizar el estado de la orden.");
      }

      await loadData();
    } catch (updateError) {
      const message =
        updateError instanceof Error ? updateError.message : "Error al actualizar la orden.";
      setError(message);
    } finally {
      setSavingOrder(null);
    }
  }

  async function updateInventoryStock(sku: string, stock: number, minimumStock: number) {
    setSavingSku(sku);
    try {
      const response = await fetch(`${apiBaseUrl}/inventory/${encodeURIComponent(sku)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock, minimumStock }),
      });

      if (!response.ok) {
        throw new Error("No se pudo actualizar el inventario.");
      }

      await loadData();
    } catch (updateError) {
      const message =
        updateError instanceof Error ? updateError.message : "Error al actualizar inventario.";
      setError(message);
    } finally {
      setSavingSku(null);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <h1>UrbanSprout Backoffice</h1>
          <p>React + Vite conectado al servicio Bun para órdenes e inventario.</p>
        </div>
        <div className="topbar-actions">
          <button type="button" className="button button-outline" onClick={() => void loadData()}>
            Recargar
          </button>
          {clerkEnabled ? (
            <>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="button button-primary" type="button">
                    Iniciar sesión admin
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <UserButton />
              </SignedIn>
            </>
          ) : (
            <span className="auth-disabled">Auth admin no configurada</span>
          )}
        </div>
      </header>

      {error ? <p className="status-error">{error}</p> : null}
      {loading ? <p>Cargando datos del backoffice...</p> : null}

      {!loading ? (
        <>
          <section className="panel">
            <h2>Órdenes</h2>
            <div className="table">
              <div className="table-row table-head">
                <span>ID</span>
                <span>Producto</span>
                <span>Comprador</span>
                <span>Monto</span>
                <span>Estado de pago</span>
              </div>
              {orders.length === 0 ? <p className="empty">No hay órdenes registradas.</p> : null}
              {orders.map((order) => (
                <div className="table-row" key={order.id}>
                  <span>{order.id}</span>
                  <span>{order.productId}</span>
                  <span>{order.buyerId}</span>
                  <span>${order.amountUsd.toFixed(2)}</span>
                  <span>
                    <select
                      disabled={savingOrder === order.id}
                      value={order.status}
                      onChange={(event) =>
                        void updateOrderStatus(order.id, event.target.value as Order["status"])
                      }
                    >
                        {ORDER_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {ORDER_STATUS_LABELS[status]}
                          </option>
                        ))}
                    </select>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2>Inventario</h2>
            <div className="table">
              <div className="table-row table-head">
                <span>SKU</span>
                <span>Stock</span>
                <span>Mínimo</span>
                <span>Acción</span>
              </div>
              {inventory.length === 0 ? (
                <p className="empty">No hay ítems de inventario registrados.</p>
              ) : null}
              {inventory.map((item) => (
                <InventoryRow
                  item={item}
                  key={item.sku}
                  saving={savingSku === item.sku}
                  onSave={(stock, minimumStock) =>
                    void updateInventoryStock(item.sku, stock, minimumStock)
                  }
                />
              ))}
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}

function InventoryRow({
  item,
  saving,
  onSave,
}: {
  item: InventoryItem;
  saving: boolean;
  onSave: (stock: number, minimumStock: number) => void;
}) {
  const [stock, setStock] = useState(item.stock);
  const [minimumStock, setMinimumStock] = useState(item.minimumStock);

  useEffect(() => {
    setStock(item.stock);
    setMinimumStock(item.minimumStock);
  }, [item.minimumStock, item.stock]);

  const lowStock = stock <= minimumStock;

  return (
    <div className="table-row">
      <span>{item.sku}</span>
      <span>
        <input
          type="number"
          value={stock}
          min={0}
          onChange={(event) => setStock(Number(event.target.value))}
        />
      </span>
      <span>
        <input
          type="number"
          value={minimumStock}
          min={0}
          onChange={(event) => setMinimumStock(Number(event.target.value))}
        />
      </span>
      <span className="inventory-actions">
        <button className="button button-primary" disabled={saving} onClick={() => onSave(stock, minimumStock)}>
          {saving ? "Guardando..." : "Guardar"}
        </button>
        {lowStock ? <small className="low-stock">Stock bajo</small> : null}
      </span>
    </div>
  );
}

export default App;
