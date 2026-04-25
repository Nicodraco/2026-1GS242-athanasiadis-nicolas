export type UserRole = "admin" | "cliente";

type ClaimsRecord = Record<string, unknown>;

function toRecord(value: unknown): ClaimsRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as ClaimsRecord;
}

function getStringValue(record: ClaimsRecord | null, key: string): string | null {
  if (!record) {
    return null;
  }

  const value = record[key];
  return typeof value === "string" ? value : null;
}

function normalizeEmail(email: string | null): string | null {
  if (!email) {
    return null;
  }

  const normalized = email.trim().replace(/^['"]|['"]$/g, "").toLowerCase();
  return normalized || null;
}

function getRoleFromClaims(sessionClaims: unknown): string | null {
  const claims = toRecord(sessionClaims);
  const metadataContainers = [
    "metadata",
    "public_metadata",
    "publicMetadata",
    "private_metadata",
    "privateMetadata",
  ];

  for (const key of metadataContainers) {
    const metadata = toRecord(claims?.[key]);
    const role = getStringValue(metadata, "role");
    if (role) {
      return role;
    }
  }

  return null;
}

export function getSessionEmail(sessionClaims: unknown): string | null {
  const claims = toRecord(sessionClaims);
  const possibleEmailKeys = ["email", "email_address", "primary_email_address"];

  for (const key of possibleEmailKeys) {
    const email = getStringValue(claims, key);
    if (email) {
      return normalizeEmail(email);
    }
  }

  const primaryEmailObject = toRecord(claims?.primary_email_address);
  const primaryEmail = getStringValue(primaryEmailObject, "email_address");
  if (primaryEmail) {
    return normalizeEmail(primaryEmail);
  }

  const emailAddresses = claims?.email_addresses;
  if (Array.isArray(emailAddresses)) {
    for (const entry of emailAddresses) {
      if (typeof entry === "string") {
        const normalized = normalizeEmail(entry);
        if (normalized) {
          return normalized;
        }
      }

      const emailRecord = toRecord(entry);
      const objectEmail =
        getStringValue(emailRecord, "email_address") ??
        getStringValue(emailRecord, "emailAddress");
      const normalized = normalizeEmail(objectEmail);
      if (normalized) {
        return normalized;
      }
    }
  }

  return null;
}

export function getUserRole(sessionClaims: unknown, fallbackEmail?: string | null): UserRole {
  const metadataRole = getRoleFromClaims(sessionClaims);
  if (metadataRole === "admin") {
    return "admin";
  }

  const email = normalizeEmail(getSessionEmail(sessionClaims) ?? fallbackEmail ?? null);
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => normalizeEmail(entry))
    .filter(Boolean);

  if (email && adminEmails.includes(email)) {
    return "admin";
  }

  return "cliente";
}
