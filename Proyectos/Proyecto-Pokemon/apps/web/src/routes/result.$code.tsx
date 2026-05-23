import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { ApiError, getBattleStateApi } from '../lib/api'
import { getOrCreatePlayerIdentity } from '../lib/player'
import { battleStore } from '../stores/battleStore'
import { roomStore } from '../stores/roomStore'
import { teamStore } from '../stores/teamStore'
import { uiStore } from '../stores/uiStore'

export const Route = createFileRoute('/result/$code')({
  component: ResultPage,
})

function ResultPage() {
  const navigate = useNavigate()
  const { code } = Route.useParams()
  const normalizedCode = code.toUpperCase()
  const identity = useMemo(() => {
    const current = roomStore.getState().identity
    return current.playerId ? current : getOrCreatePlayerIdentity()
  }, [])
  const [winner, setWinner] = useState<string | null>(battleStore.getState().battle?.winner ?? null)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const battle = await getBattleStateApi(normalizedCode)
        if (!active) {
          return
        }

        battleStore.setBattle(battle)
        setWinner(battle.winner)
      } catch (error) {
        if (active && error instanceof ApiError) {
          uiStore.pushNotice('error', `${error.code}: ${error.message}`)
        }
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [normalizedCode])

  const resetFlow = async () => {
    battleStore.clear()
    roomStore.clearRoom()
    teamStore.clearRoomSelections(normalizedCode)
    await navigate({ to: '/' })
  }

  const didWin = winner === identity.playerId

  return (
    <main className="page-wrap px-4 pb-8 pt-10">
      <section className="island-shell rounded-2xl p-8 text-center">
        <p className="island-kicker mb-2">Resultado</p>
        <h1 className="mb-3 text-4xl font-bold text-[var(--sea-ink)]">
          {winner ? (didWin ? '¡Victoria!' : 'Derrota') : 'Batalla en curso'}
        </h1>
        <p className="m-0 text-[var(--sea-ink-soft)]">
          {winner
            ? didWin
              ? 'Tu equipo ganó la batalla.'
              : 'El rival ganó esta partida.'
            : 'Aún estamos esperando el cierre oficial de la batalla.'}
        </p>
        <button
          type="button"
          onClick={resetFlow}
          className="mt-6 rounded-xl border border-[var(--line)] bg-white px-4 py-2 font-semibold"
        >
          Volver al inicio
        </button>
      </section>
    </main>
  )
}
