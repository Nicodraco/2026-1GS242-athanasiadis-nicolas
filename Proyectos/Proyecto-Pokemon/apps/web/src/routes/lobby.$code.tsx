import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, getRoomApi, setReadyApi } from '../lib/api'
import { getOrCreatePlayerIdentity } from '../lib/player'
import { roomStore, useRoomStore } from '../stores/roomStore'
import { uiStore, useUiStore } from '../stores/uiStore'

export const Route = createFileRoute('/lobby/$code')({
  component: LobbyPage,
})

const TEAM_SELECT_COUNTDOWN_SECONDS = 7

function LobbyPage() {
  const navigate = useNavigate()
  const { code } = Route.useParams()
  const normalizedCode = code.toUpperCase()
  const room = useRoomStore((state) => state.room)
  const isBusy = useUiStore((state) => state.isBusy)
  const identity = useMemo(() => {
    const current = roomStore.getState().identity
    return current.playerId ? current : getOrCreatePlayerIdentity()
  }, [])
  const [localRoomCode, setLocalRoomCode] = useState(normalizedCode)
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null)
  const navigationTriggeredRef = useRef(false)

  useEffect(() => {
    roomStore.setIdentity(identity)
    setLocalRoomCode(normalizedCode)
    navigationTriggeredRef.current = false
  }, [identity, normalizedCode])

  useEffect(() => {
    let active = true
    const syncRoom = async () => {
      try {
        const nextRoom = await getRoomApi(normalizedCode)
        if (!active) {
          return
        }

        roomStore.setRoom(nextRoom)
        if (nextRoom.status === 'in_battle') {
          navigationTriggeredRef.current = true
          await navigate({ to: '/battle/$code', params: { code: normalizedCode } })
        }
      } catch (error) {
        if (!active) {
          return
        }

        if (error instanceof ApiError) {
          uiStore.pushNotice('error', `${error.code}: ${error.message}`)
        }
      }
    }

    void syncRoom()
    const timer = setInterval(() => void syncRoom(), 2000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [navigate, normalizedCode])

  useEffect(() => {
    if (room?.status !== 'team_selection') {
      setCountdownSeconds(null)
      return
    }

    const sourceTime = room.updatedAt ? Date.parse(room.updatedAt) : Date.now()
    const startAt = Number.isNaN(sourceTime) ? Date.now() : sourceTime
    const targetAt = startAt + TEAM_SELECT_COUNTDOWN_SECONDS * 1000

    const tick = () => {
      const remainingMs = targetAt - Date.now()
      const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
      setCountdownSeconds(remainingSeconds)

      if (remainingSeconds === 0 && !navigationTriggeredRef.current) {
        navigationTriggeredRef.current = true
        void navigate({
          to: '/team-select/$code',
          params: { code: normalizedCode },
        })
      }
    }

    tick()
    const timer = setInterval(tick, 250)
    return () => clearInterval(timer)
  }, [navigate, normalizedCode, room?.status, room?.updatedAt])

  const myPlayer = room?.players.find((player) => player.playerId === identity.playerId) ?? null

  const toggleReady = async () => {
    if (!myPlayer) {
      return
    }

    try {
      uiStore.setBusy(true)
      const nextRoom = await setReadyApi(normalizedCode, {
        playerId: identity.playerId,
        isReady: !myPlayer.isReady,
      })
      roomStore.setRoom(nextRoom)
      uiStore.pushNotice('success', nextRoom.status === 'team_selection' ? 'Todos listos.' : 'Estado actualizado.')
    } catch (error) {
      if (error instanceof ApiError) {
        uiStore.pushNotice('error', `${error.code}: ${error.message}`)
        return
      }

      uiStore.pushNotice('error', 'No se pudo actualizar ready.')
    } finally {
      uiStore.setBusy(false)
    }
  }

  return (
    <main className="page-wrap px-4 pb-8 pt-10">
      <section className="island-shell rounded-2xl p-6">
        <p className="island-kicker mb-2">Lobby</p>
        <h1 className="mb-3 text-3xl font-bold text-[var(--sea-ink)]">Sala {localRoomCode}</h1>
        <p className="m-0 text-sm text-[var(--sea-ink-soft)]">
          Esperando jugadores y confirmación de listos.
        </p>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        {(room?.players ?? []).map((player) => (
          <article key={player.playerId} className="island-shell rounded-2xl p-4">
            <p className="island-kicker mb-1">{player.playerId === identity.playerId ? 'Tú' : 'Jugador'}</p>
            <h2 className="m-0 text-xl font-semibold text-[var(--sea-ink)]">{player.displayName}</h2>
            <p className="mt-2 text-sm">
              Estado:{' '}
              <strong className={player.isReady ? 'text-emerald-700' : 'text-amber-700'}>
                {player.isReady ? 'Listo' : 'No listo'}
              </strong>
            </p>
          </article>
        ))}
      </section>

      <section className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={toggleReady}
          disabled={!myPlayer || isBusy || room?.status === 'team_selection'}
          className="rounded-xl border border-[var(--line)] bg-white px-4 py-2 font-semibold disabled:opacity-50"
        >
          {myPlayer?.isReady ? 'Quitar listo' : 'Marcar listo'}
        </button>
      </section>

      {room?.status === 'team_selection' ? (
        <section className="mt-4 rounded-xl border border-emerald-300/70 bg-emerald-50/80 px-4 py-3 text-sm font-semibold text-emerald-900">
          Ambos jugadores están listos. Iniciando selección de equipo en{' '}
          <span className="inline-block min-w-6 text-center text-base">{countdownSeconds ?? TEAM_SELECT_COUNTDOWN_SECONDS}</span>
          s...
        </section>
      ) : null}
    </main>
  )
}
