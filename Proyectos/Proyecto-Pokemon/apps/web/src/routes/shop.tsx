import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  confirmShinyCheckoutApi,
  createShinyCheckoutApi,
  getHealthApi,
  getUserProfileApi,
} from '../lib/api'
import { isClerkConfigured } from '../lib/clerkEnv'
import { getOrCreatePlayerIdentity } from '../lib/player'
import { roomStore, useRoomStore } from '../stores/roomStore'
import { uiStore } from '../stores/uiStore'
import { userStore, useUserStore } from '../stores/userStore'

export const Route = createFileRoute('/shop')({
  component: ShopPage,
  validateSearch: (search: Record<string, unknown>) => ({
    status: typeof search.status === 'string' ? (search.status as string) : undefined,
    session_id: typeof search.session_id === 'string' ? (search.session_id as string) : undefined,
  }),
})

function ShopPage() {
  const search = Route.useSearch()
  const identity = useRoomStore((state) => state.identity)
  const profile = useUserStore((state) => state.profile)
  const preferShiny = useUserStore((state) => state.preferShiny)
  const [busy, setBusy] = useState(false)
  const [stripeEnabled, setStripeEnabled] = useState(true)

  const effectiveIdentity = useMemo(() => {
    if (identity.playerId) {
      return identity
    }
    const fallback = getOrCreatePlayerIdentity()
    roomStore.setIdentity(fallback)
    return fallback
  }, [identity])

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const health = await getHealthApi()
        if (!active) return
        setStripeEnabled(Boolean(health.stripeEnabled))
      } catch {
        if (active) setStripeEnabled(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const next = await getUserProfileApi(effectiveIdentity.playerId)
        if (!active) return
        userStore.setProfile(next)
      } catch (error) {
        if (active && error instanceof ApiError && error.code !== 'INVALID_ACTION') {
          uiStore.pushNotice('error', `${error.code}: ${error.message}`)
        }
      }
    })()
    return () => {
      active = false
    }
  }, [effectiveIdentity.playerId])

  useEffect(() => {
    const sessionId = search.session_id
    if (search.status !== 'success' || !sessionId) {
      return
    }
    let active = true
    void (async () => {
      try {
        await confirmShinyCheckoutApi(sessionId)
        const next = await getUserProfileApi(effectiveIdentity.playerId)
        if (!active) return
        userStore.setProfile(next)
        if (next.shinyUnlocked) {
          userStore.setPreferShiny(true)
        }
        uiStore.pushNotice('success', '¡Compra confirmada! Sprites shiny activados.')
      } catch (error) {
        if (error instanceof ApiError) {
          uiStore.pushNotice('error', `${error.code}: ${error.message}`)
        }
      }
    })()
    return () => {
      active = false
    }
  }, [effectiveIdentity.playerId, search.session_id, search.status])

  const startCheckout = async () => {
    try {
      setBusy(true)
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
      const { url } = await createShinyCheckoutApi({
        userId: effectiveIdentity.playerId,
        displayName: effectiveIdentity.displayName,
        successUrl: `${origin}/shop?status=success&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/shop?status=cancel`,
      })
      window.location.assign(url)
    } catch (error) {
      if (error instanceof ApiError) {
        uiStore.pushNotice('error', `${error.code}: ${error.message}`)
      }
    } finally {
      setBusy(false)
    }
  }

  const unlocked = profile?.shinyUnlocked === true
  const clerkOn = isClerkConfigured()

  return (
    <main className="page-wrap px-4 pb-8 pt-10">
      <section className="island-shell rounded-2xl p-6">
        <p className="island-kicker mb-2">Tienda</p>
        <h1 className="mb-3 text-3xl font-bold text-[var(--sea-ink)]">Pack Shiny</h1>
        <p className="m-0 text-sm text-[var(--sea-ink-soft)]">
          Desbloquea sprites shiny para usar en tus batallas. Pago único vía Stripe.
        </p>
      </section>

      {!clerkOn ? (
        <section className="mt-4 rounded-xl border border-amber-300/70 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
          Estás en modo invitado. Si configuras Clerk, tu compra quedará atada a tu cuenta.
        </section>
      ) : null}

      <section className="mt-6 grid gap-6 sm:grid-cols-2">
        <article className="island-shell rounded-2xl p-6">
          <h2 className="mb-2 text-xl font-bold">Estado de tu cuenta</h2>
          <p className="text-sm text-[var(--sea-ink-soft)]">
            Jugador: <strong>{effectiveIdentity.displayName}</strong>
          </p>
          <p className="mt-3">
            Shiny:{' '}
            {unlocked ? (
              <span className="rounded-full border border-emerald-300/70 bg-emerald-100/70 px-2 py-0.5 text-emerald-900">
                Desbloqueado
              </span>
            ) : (
              <span className="rounded-full border border-slate-300/70 bg-slate-100/70 px-2 py-0.5 text-slate-700">
                Bloqueado
              </span>
            )}
          </p>

          {unlocked ? (
            <label className="mt-4 flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={preferShiny}
                onChange={(event) => userStore.setPreferShiny(event.target.checked)}
              />
              Usar sprites shiny en mis batallas
            </label>
          ) : null}
        </article>

        <article className="island-shell rounded-2xl p-6">
          <h2 className="mb-2 text-xl font-bold">Comprar Pack Shiny</h2>
          <p className="text-sm text-[var(--sea-ink-soft)]">
            Pago único de USD $4.99 (precio configurable en el servidor).
          </p>
          <button
            type="button"
            disabled={busy || !stripeEnabled || unlocked}
            onClick={startCheckout}
            className="mt-4 w-full rounded-xl border border-[var(--line)] bg-[rgba(255,225,0,0.5)] px-4 py-2 font-bold text-[var(--sea-ink)] disabled:opacity-50"
          >
            {unlocked ? 'Ya desbloqueado' : busy ? 'Redirigiendo a Stripe...' : 'Pagar con Stripe'}
          </button>
          {!stripeEnabled ? (
            <p className="mt-3 text-xs text-rose-700">
              Stripe no está configurado en el backend. Agrega <code>STRIPE_SECRET_KEY</code> en el .env.
            </p>
          ) : null}
          {search.status === 'cancel' ? (
            <p className="mt-3 text-xs text-amber-700">Compra cancelada.</p>
          ) : null}
        </article>
      </section>
    </main>
  )
}
