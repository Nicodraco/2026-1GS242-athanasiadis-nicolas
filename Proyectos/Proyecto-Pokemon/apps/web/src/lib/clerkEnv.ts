export const CLERK_PUBLISHABLE_KEY =
  (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined) ?? ''

export const isClerkConfigured = (): boolean => CLERK_PUBLISHABLE_KEY.length > 0
