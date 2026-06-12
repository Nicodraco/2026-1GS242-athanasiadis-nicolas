import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import '../styles/marketplace.css'
import { useEffect, useState } from 'react'
import { NavBar } from '../components/NavBar'
import { api } from '../lib/api'
import { getAuth, updateAuthUser } from '../lib/auth'
import { styleByKey, DEFAULT_STYLE_KEY } from '../lib/skins'
import type { Item } from '../lib/types'

export const Route = createFileRoute('/marketplace')({
  validateSearch: (search: Record<string, string>) => ({
    success: search.success === 'true' ? ('true' as const) : undefined,
    canceled: search.canceled === 'true' ? ('true' as const) : undefined,
    session_id: search.session_id || undefined,
  }),
  component: () => {
    const navigate = useNavigate()
    const { success: successParam, canceled: canceledParam, session_id } = useSearch({ from: Route.id })
    const [items, setItems] = useState<Item[]>([])
    const [owned, setOwned] = useState<Set<number>>(new Set())
    const [activeSkinId, setActiveSkinId] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState<number | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [confirming, setConfirming] = useState(false)

    const refresh = async () => {
      const a = getAuth()
      if (!a) return
      setLoading(true)
      try {
        const [it, u] = await Promise.all([api.items(), api.userItems(a.user.id)])
        setItems(it.items)
        const ownedSet = new Set<number>()
        u.items.forEach(x => ownedSet.add(x.id))
        setOwned(ownedSet)
        setActiveSkinId(a.user.activeSkinId)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    }

    useEffect(() => {
      if (!getAuth()) { navigate({ to: '/login', replace: true }); return }
      refresh()
    }, [])

    useEffect(() => {
      if (session_id && !confirming) {
        setConfirming(true);
        (async () => {
          try {
            console.log('[marketplace] confirming purchase', session_id)
            const res = await api.confirmPurchase(session_id)
            console.log('[marketplace] confirm result', res)
            await refresh()
            setSuccess('Compra exitosa. Tu nueva skin ya está disponible.')
          } catch (e) {
            console.error('[marketplace] confirm error', e)
            setError((e as Error).message)
          }
        })()
        window.history.replaceState(null, '', '/marketplace')
      } else if (canceledParam) {
        setError('Compra cancelada.')
        window.history.replaceState(null, '', '/marketplace')
      }
    }, [session_id, canceledParam])

    const flash = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(null), 2200) }

    const buy = async (id: number) => {
      setError(null); setBusy(id)
      try {
        const res = await api.createCheckoutSession(id)
        if (res.url) { window.location.href = res.url } else { flash(res.message ?? 'Item adquirido'); await refresh() }
      } catch (e) { setError((e as Error).message) } finally { setBusy(null) }
    }

    const setActive = async (skinId: number | null) => {
      setError(null); setBusy(skinId ?? -1)
      try {
        await api.setActiveSkin(skinId)
        updateAuthUser({ activeSkinId: skinId ?? null })
        setActiveSkinId(skinId)
        flash(skinId === null ? 'Skin desequipada.' : 'Skin activada.')
      } catch (e) { setError((e as Error).message) } finally { setBusy(null) }
    }

    return (
      <>
        <NavBar />
        <main className="container">
          <span className="kicker">MARKETPLACE</span>
          <h1>TIENDA</h1>
          <p className="muted">Las skins gratuitas están disponibles para todos. Las skins premium se compran con Stripe.</p>
          {error && <div className="error" style={{ marginTop: 16 }}>{error}</div>}
          {success && <div className="success" style={{ marginTop: 16 }}>{success}</div>}
          {loading ? (
            <p className="muted" style={{ marginTop: 24 }}>Cargando...</p>
          ) : (
            <div className="marketplace-grid">
              {items.map(item => (
                <ItemCard key={item.id} item={item} isOwned={owned.has(item.id)} isActive={activeSkinId === item.id}
                  busy={busy === item.id} onBuy={() => buy(item.id)} onUse={() => setActive(item.id)} onUnequip={() => setActive(null)} />
              ))}
            </div>
          )}
        </main>
      </>
    )
  },
})

function ItemCard({ item, isOwned, isActive, busy, onBuy, onUse, onUnequip }: {
  item: Item; isOwned: boolean; isActive: boolean; busy: boolean; onBuy: () => void; onUse: () => void; onUnequip: () => void
}) {
  const style = styleByKey(item.image_url || DEFAULT_STYLE_KEY)
  return (
    <article className="panel marketplace-card">
      <div className="marketplace-preview" style={{ background: style.darkSquare, borderColor: 'var(--fg)' }}>
        <div className="marketplace-price">{item.price === 0 ? 'FREE' : `${(item.price / 100).toFixed(2)} $`}</div>
        <div className="marketplace-piece" style={{ background: style.whiteFill, borderColor: style.ring }} />
        <div className="marketplace-piece" style={{ background: style.blackFill, borderColor: style.ring }} />
      </div>
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <h3 style={{ margin: 0, fontSize: 22 }}>{item.name}</h3>
        {isOwned && <p className="tag tag--free" style={{ marginTop: 4 }}>YA LO TIENES</p>}
        <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>{item.description}</p>
      </div>
      <div className="row" style={{ justifyContent: 'center', marginTop: 'auto' }}>
        {!isOwned && <button className="btn btn--primary" style={{ width: '100%' }} onClick={onBuy} disabled={busy}>{busy ? '...' : item.price === 0 ? 'OBTENER' : 'COMPRAR'}</button>}
        {isOwned && !isActive && <button className="btn btn--cyan" style={{ width: '100%' }} onClick={onUse} disabled={busy}>{busy ? '...' : 'ACTIVAR'}</button>}
        {isOwned && isActive && <button className="btn btn--ghost" style={{ width: '100%' }} onClick={onUnequip} disabled={busy}>DESEQUIPAR</button>}
      </div>
    </article>
  )
}
