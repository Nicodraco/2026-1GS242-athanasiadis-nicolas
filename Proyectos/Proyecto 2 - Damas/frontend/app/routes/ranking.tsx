import { createFileRoute, useNavigate } from '@tanstack/react-router'
import '../styles/ranking.css'
import { useEffect, useState } from 'react'
import { NavBar } from '../components/NavBar'
import { api } from '../lib/api'
import { getAuth } from '../lib/auth'
import type { RankingEntry } from '../lib/types'

export const Route = createFileRoute('/ranking')({
  component: () => {
    const navigate = useNavigate()
    const [entries, setEntries] = useState<RankingEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
      if (!getAuth()) { navigate({ to: '/login', replace: true }); return }
      api.ranking(20).then(r => setEntries(r.ranking)).catch(e => setError((e as Error).message)).finally(() => setLoading(false))
    }, [])

    return (
      <>
        <NavBar />
        <main className="container">
          <span className="kicker">CLASIFICACIÓN</span>
          <h1>RANKING</h1>
          <p className="muted">Mejores jugadores por <strong>menos movimientos</strong> para ganar la partida.</p>
          {error && <div className="error" style={{ marginTop: 16 }}>{error}</div>}
          {loading ? (
            <p className="muted" style={{ marginTop: 24 }}>Cargando...</p>
          ) : entries.length === 0 ? (
            <div className="panel" style={{ marginTop: 24 }}><p>Nadie ha ganado todavía. Ve al lobby y comienza una partida.</p></div>
          ) : (
            <ol className="ranking-list">
              {entries.map((e, idx) => {
                const isTop3 = idx < 3
                return (
                  <li key={`${e.user_id}-${e.created_at}`}
                    className={`ranking-row ${isTop3 ? 'ranking-top3' : ''}`}
                    style={isTop3 ? { borderColor: idx === 0 ? 'var(--gold)' : idx === 1 ? '#c0c0c0' : '#cd7f32' } : {}}>
                    <span className="ranking-pos">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : String(idx + 1).padStart(2, '0')}</span>
                    <div className="ranking-who">
                      <div className="ranking-username" style={isTop3 ? { fontSize: 18, fontWeight: 700 } : {}}>
                        @{e.username}{idx === 0 && <span className="tag" style={{ marginLeft: 8, background: 'var(--gold)', color: '#000' }}>CAMPEÓN</span>}
                      </div>
                      <div className="muted" style={{ fontSize: 12 }}>{new Date(e.created_at).toLocaleString()}</div>
                    </div>
                    <div className="ranking-moves">
                      <div className="ranking-moves-num" style={isTop3 ? { color: 'var(--fg)' } : {}}>{e.moves_count}</div>
                      <div className="ranking-moves-label">movs</div>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </main>
      </>
    )
  },
})
