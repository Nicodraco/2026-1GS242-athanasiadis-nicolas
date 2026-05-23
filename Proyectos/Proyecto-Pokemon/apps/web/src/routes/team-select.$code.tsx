import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ApiError,
  autofillTeamApi,
  getBattleStateApi,
  getPokemonCatalogApi,
  getRoomApi,
  setTeamSelectionApi,
  startBattleApi,
  type PokemonCatalogItem,
  type RoomState,
} from '../lib/api'
import { getOrCreatePlayerIdentity } from '../lib/player'
import { getPokemonSpriteUrls } from '../lib/pokemonSprites'
import { battleStore } from '../stores/battleStore'
import { roomStore, useRoomStore } from '../stores/roomStore'
import { teamStore } from '../stores/teamStore'
import { uiStore } from '../stores/uiStore'

export const Route = createFileRoute('/team-select/$code')({
  component: TeamSelectPage,
})

const MAX_TEAM_SIZE = 6
const BATTLE_START_COUNTDOWN_SECONDS = 7
const TEAM_AUTOFILL_SECONDS = 60

const hasSameSelection = (a: number[], b: number[]): boolean => {
  if (a.length !== b.length) {
    return false
  }

  return a.every((value, index) => value === b[index])
}

const getRoomSelections = (room: RoomState | null): Record<string, number[]> => room?.teamSelections ?? {}

function TeamSelectPage() {
  const navigate = useNavigate()
  const { code } = Route.useParams()
  const normalizedCode = code.toUpperCase()
  const room = useRoomStore((state) => state.room)
  const identity = useMemo(() => {
    const current = roomStore.getState().identity
    return current.playerId ? current : getOrCreatePlayerIdentity()
  }, [])
  const [catalog, setCatalog] = useState<PokemonCatalogItem[]>([])
  const [selected, setSelected] = useState<number[]>(() => teamStore.getSelection(normalizedCode, identity.playerId))
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null)
  const [autofillRemaining, setAutofillRemaining] = useState<number>(TEAM_AUTOFILL_SECONDS)
  const startTriggeredRef = useRef(false)
  const autofillTriggeredRef = useRef(false)
  const teamSelectStartedAtRef = useRef<number | null>(null)

  useEffect(() => {
    roomStore.setIdentity(identity)
    startTriggeredRef.current = false
  }, [identity])

  useEffect(() => {
    let active = true
    const sync = async () => {
      try {
        const [pokemon, nextRoom] = await Promise.all([getPokemonCatalogApi(300), getRoomApi(normalizedCode)])
        if (!active) {
          return
        }

        setCatalog(pokemon)
        roomStore.setRoom(nextRoom)
        if (nextRoom.status === 'in_battle') {
          await navigate({ to: '/battle/$code', params: { code: normalizedCode } })
        }
      } catch (error) {
        if (!active) {
          return
        }
        if (error instanceof ApiError) {
          uiStore.pushNotice('error', `${error.code}: ${error.message}`)
          return
        }
        uiStore.pushNotice('error', 'No se pudo cargar la selección de equipo.')
      }
    }

    void sync()
    const timer = setInterval(() => void sync(), 1500)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [navigate, normalizedCode])

  useEffect(() => {
    teamStore.setSelection(normalizedCode, identity.playerId, selected)
  }, [identity.playerId, normalizedCode, selected])

  useEffect(() => {
    if (room?.status !== 'team_selection') {
      return
    }

    const remoteSelection = getRoomSelections(room)[identity.playerId] ?? []
    if (hasSameSelection(selected, remoteSelection)) {
      return
    }

    const timer = setTimeout(async () => {
      try {
        const nextRoom = await setTeamSelectionApi(normalizedCode, {
          playerId: identity.playerId,
          pokemonIds: selected,
        })
        roomStore.setRoom(nextRoom)
      } catch (error) {
        if (error instanceof ApiError) {
          uiStore.pushNotice('error', `${error.code}: ${error.message}`)
          return
        }
        uiStore.pushNotice('error', 'No se pudo actualizar la selección de equipo.')
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [identity.playerId, normalizedCode, room, selected])

  const players = room?.players ?? []
  const teamSelections = getRoomSelections(room)
  const completedPlayers = players.filter(
    (player) => (teamSelections[player.playerId]?.length ?? 0) === MAX_TEAM_SIZE,
  )
  const everyoneCompleted = players.length === 2 && completedPlayers.length === 2

  useEffect(() => {
    if (room?.status !== 'team_selection') {
      teamSelectStartedAtRef.current = null
      autofillTriggeredRef.current = false
      setAutofillRemaining(TEAM_AUTOFILL_SECONDS)
      return
    }

    if (teamSelectStartedAtRef.current === null) {
      teamSelectStartedAtRef.current = Date.now()
    }

    const targetAt = teamSelectStartedAtRef.current + TEAM_AUTOFILL_SECONDS * 1000

    const tick = () => {
      const remainingMs = targetAt - Date.now()
      const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
      setAutofillRemaining(remainingSeconds)

      if (remainingSeconds > 0 || autofillTriggeredRef.current) {
        return
      }

      if (selected.length >= MAX_TEAM_SIZE) {
        autofillTriggeredRef.current = true
        return
      }

      autofillTriggeredRef.current = true
      void (async () => {
        try {
          const nextRoom = await autofillTeamApi(normalizedCode, { playerId: identity.playerId })
          roomStore.setRoom(nextRoom)
          const mine = nextRoom.teamSelections?.[identity.playerId] ?? []
          if (mine.length > 0) {
            setSelected(mine)
            teamStore.setSelection(normalizedCode, identity.playerId, mine)
            uiStore.pushNotice('info', 'Equipo autocompletado por tiempo.')
          }
        } catch (error) {
          autofillTriggeredRef.current = false
          if (error instanceof ApiError) {
            uiStore.pushNotice('error', `${error.code}: ${error.message}`)
            return
          }
          uiStore.pushNotice('error', 'No se pudo autocompletar el equipo.')
        }
      })()
    }

    tick()
    const timer = setInterval(tick, 500)
    return () => clearInterval(timer)
  }, [identity.playerId, normalizedCode, room?.status, selected.length])

  useEffect(() => {
    if (!everyoneCompleted || room?.status !== 'team_selection') {
      setCountdownSeconds(null)
      startTriggeredRef.current = false
      return
    }

    const sourceTime = room.updatedAt ? Date.parse(room.updatedAt) : Date.now()
    const startAt = Number.isNaN(sourceTime) ? Date.now() : sourceTime
    const targetAt = startAt + BATTLE_START_COUNTDOWN_SECONDS * 1000

    const tick = () => {
      const remainingMs = targetAt - Date.now()
      const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
      setCountdownSeconds(remainingSeconds)

      if (remainingSeconds > 0 || startTriggeredRef.current) {
        return
      }

      const [firstPlayer, secondPlayer] = players
      const firstTeam = firstPlayer ? teamSelections[firstPlayer.playerId] ?? [] : []
      const secondTeam = secondPlayer ? teamSelections[secondPlayer.playerId] ?? [] : []
      if (firstTeam.length !== MAX_TEAM_SIZE || secondTeam.length !== MAX_TEAM_SIZE) {
        return
      }

      startTriggeredRef.current = true
      void (async () => {
        try {
          const battle = await startBattleApi(normalizedCode, {
            playerId: identity.playerId,
            teams: [
              { playerId: firstPlayer.playerId, pokemonIds: firstTeam },
              { playerId: secondPlayer.playerId, pokemonIds: secondTeam },
            ],
          })
          battleStore.setBattle(battle)
          await navigate({ to: '/battle/$code', params: { code: normalizedCode } })
        } catch (error) {
          if (error instanceof ApiError && error.code === 'INVALID_ACTION') {
            try {
              const existing = await getBattleStateApi(normalizedCode)
              battleStore.setBattle(existing)
              await navigate({ to: '/battle/$code', params: { code: normalizedCode } })
              return
            } catch {
              // ignored
            }
          }

          if (error instanceof ApiError) {
            uiStore.pushNotice('error', `${error.code}: ${error.message}`)
            return
          }
          uiStore.pushNotice('error', 'No se pudo iniciar la batalla.')
        }
      })()
    }

    tick()
    const timer = setInterval(tick, 250)
    return () => clearInterval(timer)
  }, [everyoneCompleted, identity.playerId, navigate, normalizedCode, players, room?.status, room?.updatedAt, teamSelections])

  const togglePokemon = (pokemonId: number) => {
    setSelected((prev) => {
      if (prev.includes(pokemonId)) {
        return prev.filter((id) => id !== pokemonId)
      }

      if (prev.length >= MAX_TEAM_SIZE) {
        return prev
      }

      return [...prev, pokemonId]
    })
  }

  const myCompleted = selected.length === MAX_TEAM_SIZE
  const opponent = players.find((player) => player.playerId !== identity.playerId) ?? null
  const opponentCount = opponent ? teamSelections[opponent.playerId]?.length ?? 0 : 0

  return (
    <main className="page-wrap px-4 pb-8 pt-10">
      <section className="island-shell rounded-2xl p-6">
        <p className="island-kicker mb-2">Selección de equipo</p>
        <h1 className="mb-2 text-3xl font-bold text-[var(--sea-ink)]">Sala {normalizedCode}</h1>
        <p className="m-0 text-sm text-[var(--sea-ink-soft)]">
          Selecciona exactamente 6 Pokémon para comenzar la batalla automáticamente.
        </p>
      </section>

      <section className="mt-4 rounded-xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm text-[var(--sea-ink)]">
        Tu equipo: <strong>{selected.length}/6</strong> · Rival: <strong>{opponentCount}/6</strong>
        {everyoneCompleted ? (
          <span className="ml-2 inline-block rounded-full border border-emerald-300/70 bg-emerald-100/70 px-2 py-0.5 text-emerald-900">
            Batalla inicia en {countdownSeconds ?? BATTLE_START_COUNTDOWN_SECONDS}s
          </span>
        ) : myCompleted ? (
          <span className="ml-2 text-[var(--sea-ink-soft)]">Esperando al rival...</span>
        ) : (
          <span className="ml-2 inline-block rounded-full border border-amber-300/70 bg-amber-100/70 px-2 py-0.5 text-amber-900">
            Auto-relleno en {autofillRemaining}s
          </span>
        )}
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {catalog.map((pokemon) => {
          const isSelected = selected.includes(pokemon.pokedexId)
          const primaryType = pokemon.types[0]?.toLowerCase() ?? ''
          return (
            <button
              type="button"
              key={pokemon.pokedexId}
              onClick={() => togglePokemon(pokemon.pokedexId)}
              className={`team-card island-shell rounded-xl p-4 text-left ${
                isSelected ? 'team-card-selected' : ''
              }`}
            >
              <p className="island-kicker mb-1">#{pokemon.pokedexId}</p>
              <div className="mt-1 flex items-center gap-3">
                <img
                  src={
                    getPokemonSpriteUrls(pokemon.pokedexId, {
                      front: pokemon.spriteFrontUrl ?? pokemon.spriteUrl,
                      back: pokemon.spriteBackUrl,
                    }).front
                  }
                  alt={`Sprite de ${pokemon.name}`}
                  className="h-16 w-16 rounded-lg border border-[var(--line)] bg-white/70 p-1 object-contain"
                  loading="lazy"
                  onError={(e) => {
                    const img = e.currentTarget
                    if (!img.src.includes('raw.githubusercontent.com')) {
                      img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.pokedexId}.png`
                    }
                  }}
                />
                <h2 className="m-0 text-lg font-semibold type-text" data-type={primaryType || undefined}>
                  {pokemon.name}
                </h2>
              </div>
              <p className="mt-2 text-xs text-[var(--sea-ink-soft)]">{pokemon.types.join(', ')}</p>
              <p className="mt-1 text-xs text-[var(--sea-ink-soft)]">
                Moves: {pokemon.battleMoveIds.join(', ')}
              </p>
            </button>
          )
        })}
      </section>
    </main>
  )
}

