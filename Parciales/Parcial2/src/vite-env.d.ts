/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_ADMIN_APP_URL?: string;
  readonly VITE_ADMIN_EMAILS?: string;
  readonly REACT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
  readonly REACT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;
  readonly REACT_PUBLIC_API_URL?: string;
  readonly REACT_PUBLIC_ADMIN_APP_URL?: string;
  readonly REACT_PUBLIC_ADMIN_EMAILS?: string;
  readonly NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
  readonly NEXT_PUBLIC_API_URL?: string;
  readonly NEXT_PUBLIC_ADMIN_APP_URL?: string;
  readonly ADMIN_EMAILS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
