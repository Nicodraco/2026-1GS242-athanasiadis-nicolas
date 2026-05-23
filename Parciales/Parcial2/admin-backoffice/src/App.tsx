import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
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

type Product = {
  id: string;
  name: string;
  description: string;
  priceUsd: number;
  tag: string;
  isActive: boolean;
  createdAt: string;
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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState<string | null>(null);
  const [savingSku, setSavingSku] = useState<string | null>(null);
  const [savingProduct, setSavingProduct] = useState<string | null>(null);
  const [creatingProduct, setCreatingProduct] = useState(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [ordersResponse, inventoryResponse, productsResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/orders`),
        fetch(`${apiBaseUrl}/inventory`),
        fetch(`${apiBaseUrl}/products?includeInactive=1`),
      ]);

      if (!ordersResponse.ok || !inventoryResponse.ok || !productsResponse.ok) {
        throw new Error("No se pudo cargar la información del backoffice.");
      }

      const ordersBody = (await ordersResponse.json()) as { data: Order[] };
      const inventoryBody = (await inventoryResponse.json()) as { data: InventoryItem[] };
      const productsBody = (await productsResponse.json()) as { data: Product[] };
      setOrders(ordersBody.data);
      setInventory(inventoryBody.data);
      setProducts(productsBody.data);
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
    let active = true;
    const controller = new AbortController();

    const loadInitialData = async () => {
      try {
        const [ordersResponse, inventoryResponse, productsResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/orders`, { signal: controller.signal }),
          fetch(`${apiBaseUrl}/inventory`, { signal: controller.signal }),
          fetch(`${apiBaseUrl}/products?includeInactive=1`, { signal: controller.signal }),
        ]);

        if (!ordersResponse.ok || !inventoryResponse.ok || !productsResponse.ok) {
          throw new Error("No se pudo cargar la información del backoffice.");
        }

        const ordersBody = (await ordersResponse.json()) as { data: Order[] };
        const inventoryBody = (await inventoryResponse.json()) as { data: InventoryItem[] };
        const productsBody = (await productsResponse.json()) as { data: Product[] };

        if (!active) return;
        setOrders(ordersBody.data);
        setInventory(inventoryBody.data);
        setProducts(productsBody.data);
      } catch (fetchError) {
        if (!active) return;
        const message =
          fetchError instanceof Error
            ? fetchError.message
            : "Ocurrió un error desconocido cargando el backoffice.";
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadInitialData();
    return () => {
      active = false;
      controller.abort();
    };
  }, [apiBaseUrl]);

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

  async function createProduct(payload: {
    id: string;
    name: string;
    description: string;
    priceUsd: number;
    tag: string;
    stock: number;
    minimumStock: number;
    isActive: boolean;
  }): Promise<boolean> {
    setCreatingProduct(true);
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "No se pudo crear el producto.");
      }

      await loadData();
      return true;
    } catch (createError) {
      const message =
        createError instanceof Error ? createError.message : "Error al crear el producto.";
      setError(message);
      return false;
    } finally {
      setCreatingProduct(false);
    }
  }

  async function updateProduct(
    productId: string,
    payload: {
      name: string;
      description: string;
      priceUsd: number;
      tag: string;
      isActive: boolean;
      stock: number;
      minimumStock: number;
    },
  ) {
    setSavingProduct(productId);
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/products/${encodeURIComponent(productId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "No se pudo actualizar el producto.");
      }

      await loadData();
    } catch (updateError) {
      const message =
        updateError instanceof Error ? updateError.message : "Error al actualizar el producto.";
      setError(message);
    } finally {
      setSavingProduct(null);
    }
  }

  async function removeProduct(productId: string) {
    setSavingProduct(productId);
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/products/${encodeURIComponent(productId)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "No se pudo eliminar el producto.");
      }

      await loadData();
    } catch (removeError) {
      const message =
        removeError instanceof Error ? removeError.message : "Error al eliminar el producto.";
      setError(message);
    } finally {
      setSavingProduct(null);
    }
  }

  const inventoryBySku = useMemo(
    () => new Map(inventory.map((item) => [item.sku, item])),
    [inventory],
  );

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <h1>UrbanSprout Backoffice</h1>
          <p>Administra órdenes, inventario y catálogo de productos.</p>
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
            <div className="table table-orders">
              <div className="table-row table-head table-orders-row">
                <span>ID</span>
                <span>Producto</span>
                <span>Comprador</span>
                <span>Monto</span>
                <span>Estado de pago</span>
              </div>
              {orders.length === 0 ? <p className="empty">No hay órdenes registradas.</p> : null}
              {orders.map((order) => (
                <div className="table-row table-orders-row" key={order.id}>
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
            <div className="table table-inventory">
              <div className="table-row table-head table-inventory-row">
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
                  key={`${item.sku}-${item.updatedAt}`}
                  saving={savingSku === item.sku}
                  onSave={(stock, minimumStock) => void updateInventoryStock(item.sku, stock, minimumStock)}
                />
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="section-head">
              <h2>Productos</h2>
              <small>Crea, edita, desactiva o elimina productos con su inventario.</small>
            </div>
            <NewProductForm creating={creatingProduct} onCreate={createProduct} />
            <div className="table table-products">
              <div className="table-row table-head table-products-row">
                <span>ID</span>
                <span>Nombre</span>
                <span>Descripción</span>
                <span>Precio</span>
                <span>Tag</span>
                <span>Activo</span>
                <span>Stock</span>
                <span>Mínimo</span>
                <span>Acciones</span>
              </div>
              {products.length === 0 ? <p className="empty">No hay productos registrados.</p> : null}
              {products.map((product) => (
                <ProductRow
                  key={`${product.id}-${product.updatedAt}-${inventoryBySku.get(product.id)?.updatedAt ?? "none"}`}
                  product={product}
                  inventory={inventoryBySku.get(product.id)}
                  saving={savingProduct === product.id}
                  onSave={(payload) => void updateProduct(product.id, payload)}
                  onDelete={() => void removeProduct(product.id)}
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

  const lowStock = stock <= minimumStock;

  return (
    <div className="table-row table-inventory-row">
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

function NewProductForm({
  creating,
  onCreate,
}: {
  creating: boolean;
  onCreate: (payload: {
    id: string;
    name: string;
    description: string;
    priceUsd: number;
    tag: string;
    stock: number;
    minimumStock: number;
    isActive: boolean;
  }) => Promise<boolean>;
}) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceUsd, setPriceUsd] = useState(0);
  const [tag, setTag] = useState("Nuevo");
  const [stock, setStock] = useState(0);
  const [minimumStock, setMinimumStock] = useState(0);
  const [isActive, setIsActive] = useState(true);

  function normalizeId(rawId: string) {
    return rawId.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const created = await onCreate({
      id: normalizeId(id),
      name: name.trim(),
      description: description.trim(),
      priceUsd: Number(priceUsd),
      tag: tag.trim(),
      stock: Number(stock),
      minimumStock: Number(minimumStock),
      isActive,
    });
    if (!created) return;

    setId("");
    setName("");
    setDescription("");
    setPriceUsd(0);
    setTag("Nuevo");
    setStock(0);
    setMinimumStock(0);
    setIsActive(true);
  }

  return (
    <form className="create-product" onSubmit={handleSubmit}>
      <input
        placeholder="ID (kit-huerto-mini)"
        value={id}
        onChange={(event) => setId(event.target.value)}
        required
      />
      <input
        placeholder="Nombre"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
      />
      <input
        placeholder="Descripción"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        required
      />
      <input
        type="number"
        min={0}
        step={0.01}
        placeholder="Precio USD"
        value={priceUsd}
        onChange={(event) => setPriceUsd(Number(event.target.value))}
        required
      />
      <input placeholder="Tag" value={tag} onChange={(event) => setTag(event.target.value)} required />
      <input
        type="number"
        min={0}
        placeholder="Stock"
        value={stock}
        onChange={(event) => setStock(Number(event.target.value))}
        required
      />
      <input
        type="number"
        min={0}
        placeholder="Mínimo"
        value={minimumStock}
        onChange={(event) => setMinimumStock(Number(event.target.value))}
        required
      />
      <label className="checkbox">
        <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
        Activo
      </label>
      <button className="button button-primary" disabled={creating} type="submit">
        {creating ? "Creando..." : "Agregar producto"}
      </button>
    </form>
  );
}

function ProductRow({
  product,
  inventory,
  saving,
  onSave,
  onDelete,
}: {
  product: Product;
  inventory?: InventoryItem;
  saving: boolean;
  onSave: (payload: {
    name: string;
    description: string;
    priceUsd: number;
    tag: string;
    isActive: boolean;
    stock: number;
    minimumStock: number;
  }) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description);
  const [priceUsd, setPriceUsd] = useState(product.priceUsd);
  const [tag, setTag] = useState(product.tag);
  const [isActive, setIsActive] = useState(product.isActive);
  const [stock, setStock] = useState(inventory?.stock ?? 0);
  const [minimumStock, setMinimumStock] = useState(inventory?.minimumStock ?? 0);

  return (
    <div className="table-row table-products-row">
      <span>{product.id}</span>
      <span>
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </span>
      <span>
        <input value={description} onChange={(event) => setDescription(event.target.value)} />
      </span>
      <span>
        <input
          type="number"
          min={0}
          step={0.01}
          value={priceUsd}
          onChange={(event) => setPriceUsd(Number(event.target.value))}
        />
      </span>
      <span>
        <input value={tag} onChange={(event) => setTag(event.target.value)} />
      </span>
      <span>
        <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
      </span>
      <span>
        <input type="number" min={0} value={stock} onChange={(event) => setStock(Number(event.target.value))} />
      </span>
      <span>
        <input
          type="number"
          min={0}
          value={minimumStock}
          onChange={(event) => setMinimumStock(Number(event.target.value))}
        />
      </span>
      <span className="product-actions">
        <button
          className="button button-primary"
          disabled={saving}
          onClick={() => onSave({ name, description, priceUsd, tag, isActive, stock, minimumStock })}
          type="button"
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
        <button className="button button-danger" disabled={saving} onClick={onDelete} type="button">
          Eliminar
        </button>
      </span>
    </div>
  );
}

export default App;
