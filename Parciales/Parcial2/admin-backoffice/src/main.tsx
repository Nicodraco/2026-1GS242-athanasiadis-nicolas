import { ClerkProvider } from "@clerk/clerk-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

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

const clerkPublishableKey = getEnvAny([
  "VITE_CLERK_PUBLISHABLE_KEY",
  "REACT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
]);
const clerkEnabled = hasRealValue(clerkPublishableKey);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {clerkEnabled ? (
      <ClerkProvider publishableKey={clerkPublishableKey}>
        <App clerkEnabled={clerkEnabled} />
      </ClerkProvider>
    ) : (
      <App clerkEnabled={clerkEnabled} />
    )}
  </StrictMode>,
)
