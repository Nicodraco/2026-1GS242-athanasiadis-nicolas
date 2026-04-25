function hasRealValue(value: string | undefined) {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return (
    !normalized.includes("xxx") &&
    !normalized.includes("dummy") &&
    !normalized.includes("example")
  );
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

function isSampleClerkKey(value: string | undefined) {
  if (!value) return true;

  if (value.toLowerCase().includes("example")) {
    return true;
  }

  const encodedPayload = value.split("_").at(-1);
  if (!encodedPayload) return false;

  try {
    const decoded = decodeBase64Url(encodedPayload).toLowerCase();
    return decoded.includes("clerk.example.com") || decoded.includes("example");
  } catch {
    return false;
  }
}

export function isClerkConfigured() {
  return (
    hasRealValue(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
    hasRealValue(process.env.CLERK_SECRET_KEY) &&
    !isSampleClerkKey(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
    !isSampleClerkKey(process.env.CLERK_SECRET_KEY)
  );
}

export function isStripeConfigured() {
  return (
    hasRealValue(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) &&
    hasRealValue(process.env.STRIPE_SECRET_KEY)
  );
}
