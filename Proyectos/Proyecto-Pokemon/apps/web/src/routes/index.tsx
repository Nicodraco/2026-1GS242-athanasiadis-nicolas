import { createFileRoute } from '@tanstack/react-router'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ApiError, createRoomApi, joinRoomApi } from '../lib/api'
import { getOrCreatePlayerIdentity, saveDisplayName } from '../lib/player'
import { roomStore } from '../stores/roomStore'
import { uiStore } from '../stores/uiStore'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const navigate = useNavigate()
  const identity = getOrCreatePlayerIdentity()
  const [displayName, setDisplayName] = useState(identity.displayName)
  const [joinCode, setJoinCode] = useState('')

  const handleApiError = (error: unknown) => {
    if (error instanceof ApiError) {
      uiStore.pushNotice('error', `${error.code}: ${error.message}`)
      return
    }

    uiStore.pushNotice('error', 'No se pudo completar la acción.')
  }

  const applyIdentity = () => {
    const finalName = displayName.trim() || identity.displayName
    saveDisplayName(finalName)
    const nextIdentity = {
      ...identity,
      displayName: finalName,
    }
    roomStore.setIdentity(nextIdentity)
    return nextIdentity
  }

  const createRoom = async () => {
    try {
      uiStore.setBusy(true)
      const nextIdentity = applyIdentity()
      const room = await createRoomApi(nextIdentity)
      roomStore.setRoom(room)
      uiStore.pushNotice('success', `Sala creada: ${room.code}`)
      await navigate({ to: '/lobby/$code', params: { code: room.code } })
    } catch (error) {
      handleApiError(error)
    } finally {
      uiStore.setBusy(false)
    }
  }

  const joinRoom = async () => {
    const code = joinCode.trim().toUpperCase()
    if (!code) {
      uiStore.pushNotice('error', 'Ingresa un código de sala.')
      return
    }

    try {
      uiStore.setBusy(true)
      const nextIdentity = applyIdentity()
      const room = await joinRoomApi(code, nextIdentity)
      roomStore.setRoom(room)
      uiStore.pushNotice('success', `Te uniste a la sala ${room.code}`)
      await navigate({ to: '/lobby/$code', params: { code: room.code } })
    } catch (error) {
      handleApiError(error)
    } finally {
      uiStore.setBusy(false)
    }
  }

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="island-shell rise-in rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <p className="island-kicker mb-3">Pokemon Battle Rooms</p>
        <h1 className="display-title mb-5 text-4xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-6xl">
          Batallas 1v1 por código de sala
        </h1>
        <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          Crea una sala, invita a otro jugador, arma tu equipo y juega turnos en tiempo real.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Tu nombre de entrenador"
            className="rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2"
          />
          <input
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            placeholder="Código de sala"
            className="rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2"
          />
          <button
            type="button"
            onClick={joinRoom}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 font-semibold"
          >
            Unirse a sala
          </button>
        </div>

        <button
          type="button"
          onClick={createRoom}
          className="mt-4 rounded-xl border border-[var(--line)] bg-[rgba(79,184,178,0.2)] px-5 py-2 font-semibold text-[var(--sea-ink)]"
        >
          Crear sala
        </button>
      </section>

      <section className="island-shell mt-8 rounded-2xl p-6">
        <p className="island-kicker mb-2">Flujo</p>
        <p className="m-0 text-sm text-[var(--sea-ink-soft)]">
          Inicio → Lobby → Selección de equipo → Batalla → Resultado
        </p>
      </section>
    </main>
  )
}
