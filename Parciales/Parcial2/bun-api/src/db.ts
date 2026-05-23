import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

const dbPath = process.env.BUN_DB_PATH?.trim() || "./data/urbansprout.sqlite";
mkdirSync(dirname(dbPath), { recursive: true });

export const db = new Database(dbPath, { create: true });

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    checkout_session_id TEXT UNIQUE NOT NULL,
    product_id TEXT NOT NULL,
    buyer_id TEXT NOT NULL,
    status TEXT NOT NULL,
    amount_usd REAL NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS inventory (
    sku TEXT PRIMARY KEY,
    stock INTEGER NOT NULL,
    minimum_stock INTEGER NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS checkout_attempts (
    checkout_session_id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    buyer_id TEXT NOT NULL,
    amount_usd REAL NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price_usd REAL NOT NULL,
    tag TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

export type Product = {
  id: string;
  name: string;
  description: string;
  priceUsd: number;
  tag: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const productCount = db.query("SELECT COUNT(*) AS count FROM products").get() as
  | { count: number }
  | undefined;

if (!productCount || productCount.count === 0) {
  const now = new Date().toISOString();
  const insertProduct = db.query(
    `INSERT INTO products (
      id, name, description, price_usd, tag, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  insertProduct.run(
    "kit-balcon-basico",
    "Kit Balcón Básico",
    "Lechuga + cilantro + cebollín para espacios con 2-3 horas de luz.",
    24.9,
    "Inicio",
    1,
    now,
    now,
  );
  insertProduct.run(
    "kit-microverde-rapido",
    "Kit Microverde Rápido",
    "Microbrotes listos en 7-10 días, ideal para cocina en apartamentos.",
    29.9,
    "Más vendido",
    1,
    now,
    now,
  );
  insertProduct.run(
    "kit-aromaticas-compacto",
    "Kit Aromáticas Compacto",
    "Albahaca + menta + perejil con guía de poda y riego urbano.",
    34.9,
    "Premium",
    1,
    now,
    now,
  );
}

const inventoryCount = db.query("SELECT COUNT(*) AS count FROM inventory").get() as
  | { count: number }
  | undefined;

if (!inventoryCount || inventoryCount.count === 0) {
  const now = new Date().toISOString();
  const insertInventory = db.query(
    "INSERT INTO inventory (sku, stock, minimum_stock, updated_at) VALUES (?, ?, ?, ?)",
  );
  insertInventory.run("kit-balcon-basico", 18, 5, now);
  insertInventory.run("kit-microverde-rapido", 24, 8, now);
  insertInventory.run("kit-aromaticas-compacto", 15, 5, now);
}

export type OrderStatus = "pending" | "paid" | "cancelled";

export type PendingOrder = {
  checkoutSessionId: string;
  productId: string;
  buyerId: string;
  amountUsd: number;
};

export function listOrders() {
  return db
    .query(
      `SELECT
        id,
        checkout_session_id AS checkoutSessionId,
        product_id AS productId,
        buyer_id AS buyerId,
        status,
        amount_usd AS amountUsd,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM orders
      ORDER BY created_at DESC`,
    )
    .all();
}

export function listPendingOrders(): PendingOrder[] {
  return db
    .query(
      `SELECT
        checkout_session_id AS checkoutSessionId,
        product_id AS productId,
        buyer_id AS buyerId,
        amount_usd AS amountUsd
      FROM checkout_attempts
      WHERE status = 'open'`,
    )
    .all() as PendingOrder[];
}

export function createCheckoutAttempt(params: {
  checkoutSessionId: string;
  productId: string;
  buyerId: string;
  amountUsd: number;
}) {
  const now = new Date().toISOString();
  db.query(
    `INSERT OR REPLACE INTO checkout_attempts (
      checkout_session_id, product_id, buyer_id, amount_usd, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'open', ?, ?)`,
  ).run(
    params.checkoutSessionId,
    params.productId,
    params.buyerId,
    params.amountUsd,
    now,
    now,
  );
}

export function closeCheckoutAttempt(checkoutSessionId: string) {
  const now = new Date().toISOString();
  db.query(
    "UPDATE checkout_attempts SET status = 'closed', updated_at = ? WHERE checkout_session_id = ?",
  ).run(now, checkoutSessionId);
}

export function updateOrderStatus(orderId: string, status: OrderStatus) {
  const now = new Date().toISOString();
  db.query("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?").run(status, now, orderId);
}

export function upsertOrderFromCheckout(params: {
  checkoutSessionId: string;
  productId: string;
  buyerId: string;
  status: OrderStatus;
  amountUsd: number;
}) {
  const existing = db
    .query("SELECT id FROM orders WHERE checkout_session_id = ?")
    .get(params.checkoutSessionId) as { id: string } | null;
  const now = new Date().toISOString();

  if (existing?.id) {
    db.query(
      `UPDATE orders
       SET status = ?, amount_usd = ?, product_id = ?, buyer_id = ?, updated_at = ?
       WHERE checkout_session_id = ?`,
    ).run(
      params.status,
      params.amountUsd,
      params.productId,
      params.buyerId,
      now,
      params.checkoutSessionId,
    );
    return;
  }

  db.query(
    `INSERT INTO orders (
      id, checkout_session_id, product_id, buyer_id, status, amount_usd, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    randomUUID(),
    params.checkoutSessionId,
    params.productId,
    params.buyerId,
    params.status,
    params.amountUsd,
    now,
    now,
  );
}

export function listInventory() {
  return db
    .query(
      `SELECT
        sku,
        stock,
        minimum_stock AS minimumStock,
        updated_at AS updatedAt
      FROM inventory
      ORDER BY sku ASC`,
    )
    .all();
}

export function createProduct(params: {
  id: string;
  name: string;
  description: string;
  priceUsd: number;
  tag: string;
  stock: number;
  minimumStock: number;
  isActive: boolean;
}) {
  const now = new Date().toISOString();
  db.transaction(() => {
    db.query(
      `INSERT INTO products (
        id, name, description, price_usd, tag, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      params.id,
      params.name,
      params.description,
      params.priceUsd,
      params.tag,
      params.isActive ? 1 : 0,
      now,
      now,
    );
    db.query(
      "INSERT INTO inventory (sku, stock, minimum_stock, updated_at) VALUES (?, ?, ?, ?)",
    ).run(params.id, params.stock, params.minimumStock, now);
  })();
}

export function listProducts(options: { includeInactive?: boolean } = {}): Product[] {
  const where = options.includeInactive ? "" : "WHERE is_active = 1";
  return db
    .query(
      `SELECT
        id,
        name,
        description,
        price_usd AS priceUsd,
        tag,
        is_active AS isActiveRaw,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM products
      ${where}
      ORDER BY created_at DESC`,
    )
    .all()
    .map((row) => {
      const product = row as Omit<Product, "isActive"> & { isActiveRaw: number };
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        priceUsd: product.priceUsd,
        tag: product.tag,
        isActive: product.isActiveRaw === 1,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      };
    });
}

export function getProductById(productId: string): Product | null {
  const row = db
    .query(
      `SELECT
        id,
        name,
        description,
        price_usd AS priceUsd,
        tag,
        is_active AS isActiveRaw,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM products
      WHERE id = ?`,
    )
    .get(productId) as (Omit<Product, "isActive"> & { isActiveRaw: number }) | null;

  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    priceUsd: row.priceUsd,
    tag: row.tag,
    isActive: row.isActiveRaw === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function updateProduct(
  productId: string,
  updates: {
    name?: string;
    description?: string;
    priceUsd?: number;
    tag?: string;
    isActive?: boolean;
    stock?: number;
    minimumStock?: number;
  },
) {
  const existingProduct = getProductById(productId);
  if (!existingProduct) return false;

  const now = new Date().toISOString();
  db.transaction(() => {
    db.query(
      `UPDATE products
       SET name = ?, description = ?, price_usd = ?, tag = ?, is_active = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      updates.name ?? existingProduct.name,
      updates.description ?? existingProduct.description,
      updates.priceUsd ?? existingProduct.priceUsd,
      updates.tag ?? existingProduct.tag,
      (updates.isActive ?? existingProduct.isActive) ? 1 : 0,
      now,
      productId,
    );

    if (typeof updates.stock === "number" || typeof updates.minimumStock === "number") {
      const existingInventory = db
        .query("SELECT stock, minimum_stock AS minimumStock FROM inventory WHERE sku = ?")
        .get(productId) as { stock: number; minimumStock: number } | null;
      if (!existingInventory) {
        db.query(
          "INSERT INTO inventory (sku, stock, minimum_stock, updated_at) VALUES (?, ?, ?, ?)",
        ).run(productId, updates.stock ?? 0, updates.minimumStock ?? 0, now);
      } else {
        db.query("UPDATE inventory SET stock = ?, minimum_stock = ?, updated_at = ? WHERE sku = ?").run(
          updates.stock ?? existingInventory.stock,
          updates.minimumStock ?? existingInventory.minimumStock,
          now,
          productId,
        );
      }
    }
  })();

  return true;
}

export function productHasOrders(productId: string) {
  const row = db
    .query("SELECT COUNT(*) AS count FROM orders WHERE product_id = ?")
    .get(productId) as { count: number } | null;
  return (row?.count ?? 0) > 0;
}

export function deleteProduct(productId: string) {
  const existingProduct = getProductById(productId);
  if (!existingProduct) return false;

  db.transaction(() => {
    db.query("DELETE FROM inventory WHERE sku = ?").run(productId);
    db.query("DELETE FROM products WHERE id = ?").run(productId);
  })();

  return true;
}

export function updateInventory(params: { sku: string; stock: number; minimumStock: number }) {
  const existing = db.query("SELECT sku FROM inventory WHERE sku = ?").get(params.sku) as
    | { sku: string }
    | null;
  if (!existing) return false;

  const now = new Date().toISOString();
  db.query("UPDATE inventory SET stock = ?, minimum_stock = ?, updated_at = ? WHERE sku = ?").run(
    params.stock,
    params.minimumStock,
    now,
    params.sku,
  );

  return true;
}
