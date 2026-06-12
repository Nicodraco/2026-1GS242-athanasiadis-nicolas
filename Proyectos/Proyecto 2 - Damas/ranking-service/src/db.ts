import { MongoClient, Db } from 'mongodb';

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017';

let client: MongoClient;
let db: Db;

export async function connectDB(): Promise<Db> {
  if (db) return db;
  client = new MongoClient(MONGODB_URL);
  await client.connect();
  db = client.db('damas');
  console.log('[ranking] connected to MongoDB');
  return db;
}

export function getDB(): Db {
  if (!db) throw new Error('DB not connected');
  return db;
}
