function hasRealValue(value: string | undefined) {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return (
    !normalized.includes("xxx") &&
    !normalized.includes("dummy") &&
    !normalized.includes("example")
  );
}

function getEnvAny(keys: string[]) {
  const source = import.meta.env as Record<string, string | undefined>;
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}

function normalizeUrl(value: string | undefined, fallback: string) {
  const raw = value?.trim();
  if (!raw) return fallback;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("localhost:") || raw.startsWith("127.0.0.1:")) return `http://${raw}`;
  return raw;
}

export function isClerkConfigured() {
  return hasRealValue(
    getEnvAny([
      "VITE_CLERK_PUBLISHABLE_KEY",
      "REACT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    ]),
  );
}

export function getClerkPublishableKey() {
  return (
    getEnvAny([
      "VITE_CLERK_PUBLISHABLE_KEY",
      "REACT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    ]) ?? ""
  );
}

export function getAdminAppUrl() {
  return normalizeUrl(
    getEnvAny(["VITE_ADMIN_APP_URL", "REACT_PUBLIC_ADMIN_APP_URL", "NEXT_PUBLIC_ADMIN_APP_URL"]),
    "http://localhost:5173",
  );
}

export function getApiUrl() {
  return normalizeUrl(
    getEnvAny(["VITE_API_URL", "REACT_PUBLIC_API_URL", "NEXT_PUBLIC_API_URL"]),
    "http://localhost:4000",
  );
}

export function getAdminEmails() {
  return (
    getEnvAny(["VITE_ADMIN_EMAILS", "REACT_PUBLIC_ADMIN_EMAILS", "ADMIN_EMAILS"]) ||
    "admin@urbansprout.com"
  )
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}
