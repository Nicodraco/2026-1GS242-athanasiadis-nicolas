import { MongoClient, type Db } from "mongodb";

import { env } from "../config/env";

let client: MongoClient | null = null;
let db: Db | null = null;

export const getDb = async (): Promise<Db> => {
  if (db) {
    return db;
  }

  if (!client) {
    client = new MongoClient(env.MONGODB_URI);
  }

  await client.connect();
  db = client.db(env.MONGODB_DB_NAME);
  return db;
};

