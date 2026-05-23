import type { Collection, Db } from "mongodb";

export type UserDocument = {
  userId: string;
  displayName: string | null;
  shinyUnlocked: boolean;
  stripeCustomerId: string | null;
  stripeSessionIds: string[];
  createdAt: Date;
  updatedAt: Date;
};

export const getUsersCollection = (db: Db): Collection<UserDocument> => {
  return db.collection<UserDocument>("users");
};

export const ensureUserIndexes = async (db: Db): Promise<void> => {
  const users = getUsersCollection(db);
  await users.createIndex({ userId: 1 }, { unique: true });
  await users.createIndex({ stripeCustomerId: 1 });
};

export const getOrCreateUser = async (
  db: Db,
  userId: string,
  displayName?: string | null,
): Promise<UserDocument> => {
  const users = getUsersCollection(db);
  const existing = await users.findOne({ userId });
  if (existing) {
    if (displayName && displayName !== existing.displayName) {
      const updated: UserDocument = {
        ...existing,
        displayName,
        updatedAt: new Date(),
      };
      await users.updateOne({ userId }, { $set: { displayName, updatedAt: updated.updatedAt } });
      return updated;
    }
    return existing;
  }

  const now = new Date();
  const doc: UserDocument = {
    userId,
    displayName: displayName ?? null,
    shinyUnlocked: false,
    stripeCustomerId: null,
    stripeSessionIds: [],
    createdAt: now,
    updatedAt: now,
  };
  await users.insertOne(doc);
  return doc;
};

export const setShinyUnlocked = async (
  db: Db,
  userId: string,
  sessionId: string,
  stripeCustomerId: string | null,
): Promise<void> => {
  const users = getUsersCollection(db);
  await users.updateOne(
    { userId },
    {
      $set: {
        shinyUnlocked: true,
        stripeCustomerId,
        updatedAt: new Date(),
      },
      $addToSet: { stripeSessionIds: sessionId },
    },
    { upsert: false },
  );
};
