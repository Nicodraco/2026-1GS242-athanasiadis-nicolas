import { MongoClient, Db } from 'mongodb';

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017';

let client: MongoClient;
let db: Db;

export async function connectDB(): Promise<Db> {
  if (db) return db;
  client = new MongoClient(MONGODB_URL);
  await client.connect();
  db = client.db('damas');
  console.log('[marketplace] connected to MongoDB');
  return db;
}

export function getDB(): Db {
  if (!db) throw new Error('DB not connected');
  return db;
}

export async function seedSkins(): Promise<void> {
  const db = getDB();
  const count = await db.collection('skins').countDocuments();
  if (count > 0) return;
  const skins = [
    { name: 'Classic', description: 'Las damas de toda la vida.', price: 0, image_url: 'classic' },
    { name: 'Midnight', description: 'Azul medianoche con bordes duros.', price: 0, image_url: 'midnight' },
    { name: 'Slate', description: 'Gris piedra, minimalista y serio.', price: 0, image_url: 'slate' },
    { name: 'Neon', description: 'Verde acido y magenta electrico.', price: 150, image_url: 'neon' },
    { name: 'Gold', description: 'Oro macizo.', price: 300, image_url: 'gold' },
    { name: 'Vapor', description: 'Vaporwave: cian y rosa pastel.', price: 220, image_url: 'vapor' },
    { name: 'Cyberpunk', description: 'Neones cian y magenta futuristas.', price: 250, image_url: 'cyberpunk' },
    { name: 'Forest', description: 'Colores terrosos y verdes profundos.', price: 180, image_url: 'forest' },
    { name: 'Ocean', description: 'Azules profundos y espuma de mar.', price: 200, image_url: 'ocean' },
  ];
  await db.collection('skins').insertMany(skins.map((s, i) => ({ ...s, id: i + 1 })));
  console.log('[marketplace] seeded skins');
}
