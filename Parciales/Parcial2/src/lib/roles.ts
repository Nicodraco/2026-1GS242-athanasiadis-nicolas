import { getAdminEmails } from "@/lib/env";

export type UserRole = "admin" | "cliente";

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() || null;
}

export function getUserRole(user: {
  primaryEmailAddress?: { emailAddress?: string | null } | null;
  publicMetadata?: { role?: unknown } | null;
} | null | undefined): UserRole {
  const metadataRole = user?.publicMetadata?.role;
  if (metadataRole === "admin") {
    return "admin";
  }

  const email = normalizeEmail(user?.primaryEmailAddress?.emailAddress ?? null);
  if (!email) {
    return "cliente";
  }

  const adminEmails = getAdminEmails();
  return adminEmails.includes(email) ? "admin" : "cliente";
}
