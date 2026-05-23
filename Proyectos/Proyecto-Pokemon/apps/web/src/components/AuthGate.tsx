import { useEffect } from 'react'
import { ClerkProvider, SignedIn, SignedOut, SignInButton, UserButton, useUser } from '@clerk/clerk-react'
import { CLERK_PUBLISHABLE_KEY, isClerkConfigured } from '../lib/clerkEnv'
import { buildClerkIdentity } from '../lib/player'
import { roomStore } from '../stores/roomStore'

function ClerkIdentitySync() {
  const { isSignedIn, user } = useUser()

  useEffect(() => {
    if (!isSignedIn || !user) {
      return
    }
    const displayName =
      user.username ||
      user.firstName ||
      user.primaryEmailAddress?.emailAddress?.split('@')[0] ||
      'Entrenador'
    const identity = buildClerkIdentity(user.id, displayName)
    roomStore.setIdentity(identity)
  }, [isSignedIn, user])

  return null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!isClerkConfigured()) {
    return <>{children}</>
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
      <ClerkIdentitySync />
      {children}
    </ClerkProvider>
  )
}

export function HeaderAuthControls() {
  if (!isClerkConfigured()) {
    return (
      <span className="text-xs italic text-[var(--sea-ink-soft)]">
        Modo invitado
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <SignedOut>
        <SignInButton mode="modal">
          <button
            type="button"
            className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm font-semibold text-[var(--sea-ink)]"
          >
            Iniciar sesión
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </div>
  )
}
