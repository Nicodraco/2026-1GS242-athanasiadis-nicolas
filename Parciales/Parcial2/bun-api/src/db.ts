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
      FROM orders
      WHERE status = 'pending'`,
    )
    .all() as PendingOrder[];
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

export function updateInventory(params: { sku: string; stock: number; minimumStock: number }) {
  const now = new Date().toISOString();
  db.query("UPDATE inventory SET stock = ?, minimum_stock = ?, updated_at = ? WHERE sku = ?").run(
    params.stock,
    params.minimumStock,
    now,
    params.sku,
  );
}
