import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import '../styles/game.css'
import { useEffect, useMemo, useState } from 'react'
import { NavBar } from '../components/NavBar'
import { CheckersBoard } from '../components/Board'
import { useGameSocket } from '../lib/socket'
import { getAuth } from '../lib/auth'
import { api } from '../lib/api'
import { DEFAULT_STYLE_KEY, styleByKey } from '../lib/skins'
import type { AuthState } from '../lib/types'

export const Route = createFileRoute('/game/$id')({
  component: () => {
    const { id: gameId } = useParams({ from: Route.id })
    const navigate = useNavigate()
    const [auth, setAuthState] = useState<AuthState | null>(null)
    const [styleKey, setStyleKey] = useState<string>(DEFAULT_STYLE_KEY)
    const [actionError, setActionError] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
      const a = getAuth()
      if (!a) { navigate({ to: '/login', replace: true }); return }
      setAuthState(a)
      if (a.user.activeSkinId !== null) {
        api.items().then(s => {
          const skin = s.items.find(i => i.id === a.user.activeSkinId)
          if (skin?.image_url) setStyleKey(skin.image_url)
        }).catch(() => undefined)
      }
    }, [])

    const { state, gameOver, role, error, sendMove } = useGameSocket(gameId)
    const skin = useMemo(() => styleByKey(styleKey), [styleKey])

    if (!auth) return null

    const myColor: 'white' | 'black' | null = role === 'player1' ? 'white' : role === 'player2' ? 'black' : null

    const handleMove = async (from: [number, number], to: [number, number]) => {
      setActionError(null)
      const ack = await sendMove(from, to)
      if (!ack.ok) setActionError(ack.error ?? 'Movimiento rechazado')
    }

    return (
      <>
        <NavBar />
        <main className="container">
          <div className="game-layout">
            <aside className="game-sidebar">
              <div className="panel">
                <span className="kicker">ESTADO</span>
                <h2 style={{ fontSize: 28, margin: '8px 0 16px' }}>
                  {state?.status === 'waiting' ? 'ESPERANDO' : state?.status === 'finished' ? 'TERMINADA' : 'EN JUEGO'}
                </h2>
                {state && (
                  <div className="stack" style={{ marginTop: 12 }}>
                    <p><strong>Turno:</strong> {state.currentPlayer.toUpperCase()}</p>
                    <p><strong>Movimientos:</strong> {state.moves.p1 + state.moves.p2}</p>
                    {state.mustContinueFrom && <p style={{ color: 'var(--red)', fontWeight: 700 }}>Captura múltiple en curso</p>}
                    {state.isVsAi && <p><span className="tag">IA</span> Modo vs A*</p>}
                  </div>
                )}
              </div>
              <div className="panel">
                <span className="kicker">JUGADORES</span>
                {state ? (
                  <div className="stack">
                    <PlayerLine label="BLANCAS" username={state.player1.username} moves={state.moves.p1}
                      active={state.status === 'active' && state.currentPlayer === 'white'} mine={myColor === 'white'} color="#f3e8c9" />
                    <PlayerLine label="NEGRAS" username={state.player2 ? state.player2.username : 'Esperando...'} moves={state.moves.p2}
                      active={state.status === 'active' && state.currentPlayer === 'black'} mine={myColor === 'black'} color="#1a1a1a" />
                  </div>
                ) : <p className="muted">Conectando...</p>}
              </div>
              {state?.status === 'waiting' && !state.isVsAi && (
                <div className="panel panel--yellow">
                  <span className="kicker">SALA</span>
                  <p className="text-mono" style={{ wordBreak: 'break-all', fontSize: 13, marginTop: 8 }}>{gameId}</p>
                  <button className="btn" style={{ width: '100%', marginTop: 12 }}
                    onClick={async () => { try { await navigator.clipboard.writeText(gameId); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {} }}>
                    {copied ? 'COPIADO' : 'COPIAR ID'}
                  </button>
                </div>
              )}
            </aside>
            <div className="game-board-col">
              <div style={{ width: '100%', maxWidth: 'max-content' }}>
                {error && <div className="error" style={{ marginBottom: 16 }}>{error}</div>}
                {actionError && <div className="error" style={{ marginBottom: 16 }}>{actionError}</div>}
                {state ? (
                  <CheckersBoard board={state.board} currentPlayer={state.currentPlayer}
                    mustContinueFrom={state.mustContinueFrom} myColor={myColor}
                    skin={skin} onMove={handleMove} disabled={state.status !== 'active'} />
                ) : <div className="panel">Cargando tablero...</div>}
              </div>
            </div>
          </div>
          {gameOver && (
            <div className="game-overlay">
              <div className="panel panel--lime" style={{ maxWidth: 480 }}>
                <span className="kicker">FIN DE LA PARTIDA</span>
                <h2>{gameOver.winnerUsername ? `GANA ${gameOver.winnerUsername.toUpperCase()}` : 'EMPATE'}</h2>
                <p>Movimientos del ganador: <strong>{gameOver.movesCount}</strong></p>
                <div className="row" style={{ marginTop: 16 }}>
                  <button className="btn btn--primary" onClick={() => navigate({ to: '/lobby' })}>VOLVER AL LOBBY</button>
                  <button className="btn" onClick={() => navigate({ to: '/ranking' })}>VER RANKING</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </>
    )
  },
})

function PlayerLine({ label, username, moves, active, mine, color }: { label: string; username: string; moves: number; active: boolean; mine: boolean; color: string }) {
  return (
    <div className={'game-player' + (active ? ' game-player-active' : '')}>
      <span className="game-dot" style={{ background: color }} />
      <div style={{ flex: 1 }}>
        <div className="game-player-label">{label} {mine && <span className="tag">TU</span>}</div>
        <div className="game-player-name">@{username}</div>
      </div>
      <div className="game-player-moves">{moves}</div>
    </div>
  )
}
