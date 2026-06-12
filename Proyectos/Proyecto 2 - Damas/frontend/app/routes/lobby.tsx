import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { NavBar } from '../components/NavBar'
import { api } from '../lib/api'
import { getAuth } from '../lib/auth'

export const Route = createFileRoute('/lobby')({
  component: () => {
    const navigate = useNavigate()
    const [joinId, setJoinId] = useState('')
    const [loading, setLoading] = useState<null | 'ai' | 'human' | 'join'>(null)
    const [error, setError] = useState<string | null>(null)

    const handle = async (kind: 'ai' | 'human' | 'join', fn: () => Promise<string>) => {
      setError(null)
      setLoading(kind)
      try {
        const gameId = await fn()
        navigate({ to: `/game/$id`, params: { id: gameId } })
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(null)
      }
    }

    if (!getAuth()) return null

    return (
      <>
        <NavBar />
        <main className="container">
          <span className="kicker">LOBBY</span>
          <h1>JUEGA AHORA</h1>
          <p className="muted">Elige cómo quieres jugar tu próxima partida.</p>
          {error && <div className="error" style={{ marginTop: 16 }}>{error}</div>}
          <div className="stack" style={{ marginTop: 28 }}>
            <section className="panel panel--yellow" style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
              <div style={{ flex: '1 1 300px' }}>
                <span className="kicker">MODO ENTRENAMIENTO</span>
                <h2>DESAFÍA A LA IA</h2>
                <p style={{ fontSize: 18 }}>Perfecciona tu estrategia contra nuestra IA basada en el algoritmo A*. Reglas estándar de damas inglesas con captura obligatoria.</p>
              </div>
              <button className="btn btn--lg btn--primary" style={{ minWidth: 240, height: 80, fontSize: 18 }}
                onClick={() => handle('ai', async () => (await api.newGame(true)).gameId)}
                disabled={loading !== null}>
                {loading === 'ai' ? '...' : 'EMPEZAR AHORA'}
              </button>
            </section>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
              <section className="panel panel--cyan">
                <span className="kicker">MULTIJUGADOR</span>
                <h2>CREAR PARTIDA</h2>
                <p>Genera un código único y compártelo con un amigo para jugar en tiempo real.</p>
                <button className="btn btn--lg" style={{ width: '100%', marginTop: 12 }}
                  onClick={() => handle('human', async () => (await api.newGame(false)).gameId)}
                  disabled={loading !== null}>
                  {loading === 'human' ? '...' : 'CREAR NUEVA SALA'}
                </button>
              </section>
              <section className="panel panel--pink">
                <span className="kicker">UNIRSE A SALA</span>
                <h2>¿TIENES UN CÓDIGO?</h2>
                <p>Introduce el identificador de la partida para entrar al tablero.</p>
                <form onSubmit={e => { e.preventDefault(); if (!joinId.trim()) return; handle('join', async () => { await api.joinGame(joinId.trim()); return joinId.trim() }) }} style={{ marginTop: 12 }}>
                  <div className="row" style={{ gap: 12 }}>
                    <input className="input" value={joinId} onChange={e => setJoinId(e.target.value)} placeholder="ID de la partida" style={{ flex: 1, height: 48 }} required />
                    <button className="btn" type="submit" style={{ height: 48 }} disabled={loading !== null}>
                      {loading === 'join' ? '...' : 'ENTRAR'}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          </div>
        </main>
      </>
    )
  },
})
