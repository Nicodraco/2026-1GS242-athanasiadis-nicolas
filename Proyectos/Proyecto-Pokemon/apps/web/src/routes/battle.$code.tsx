import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import BattleField from '../components/BattleField'
import MoveButton from '../components/MoveButton'
import TypeBadges from '../components/TypeBadges'
import {
  ApiError,
  forfeitBattleApi,
  getBattleLogApi,
  getBattleStateApi,
  getMoveCatalogApi,
  submitBattleActionApi,
  type MoveCatalogItem,
} from '../lib/api'
import { getOrCreatePlayerIdentity } from '../lib/player'
import { battleStore, useBattleStore } from '../stores/battleStore'
import { roomStore } from '../stores/roomStore'
import { uiStore } from '../stores/uiStore'
import { useUserStore } from '../stores/userStore'

export const Route = createFileRoute('/battle/$code')({
  component: BattlePage,
})

function BattlePage() {
  const navigate = useNavigate()
  const { code } = Route.useParams()
  const normalizedCode = code.toUpperCase()
  const identity = useMemo(() => {
    const current = roomStore.getState().identity
    return current.playerId ? current : getOrCreatePlayerIdentity()
  }, [])
  const battle = useBattleStore((state) => state.battle)
  const log = useBattleStore((state) => state.log)
  const userShinyUnlocked = useUserStore((state) => state.profile?.shinyUnlocked ?? false)
  const preferShiny = useUserStore((state) => state.preferShiny)
  const useShiny = userShinyUnlocked && preferShiny
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [forfeitConfirm, setForfeitConfirm] = useState(false)
  const [myAnimation, setMyAnimation] = useState<'attack' | 'damage' | 'switch' | null>(null)
  const [enemyAnimation, setEnemyAnimation] = useState<'attack' | 'damage' | 'switch' | null>(null)
  const [lastEventId, setLastEventId] = useState('')
  const [actionPanel, setActionPanel] = useState<'menu' | 'move' | 'switch'>('menu')
  const [moveCatalog, setMoveCatalog] = useState<Record<string, MoveCatalogItem>>({})
  const requestedMoveIds = useRef(new Set<string>())

  useEffect(() => {
    roomStore.setIdentity(identity)
  }, [identity])

  useEffect(() => {
    let active = true
    const sync = async () => {
      try {
        const [state, logState] = await Promise.all([
          getBattleStateApi(normalizedCode),
          getBattleLogApi(normalizedCode),
        ])
        if (!active) {
          return
        }

        battleStore.setBattle(state)
        battleStore.setLog(logState.battleLog)
        if (state.winner) {
          await navigate({ to: '/result/$code', params: { code: normalizedCode } })
        }
      } catch (error) {
        if (active && error instanceof ApiError) {
          uiStore.pushNotice('error', `${error.code}: ${error.message}`)
        }
      }
    }

    void sync()
    const timer = setInterval(() => void sync(), 2000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [navigate, normalizedCode])

  useEffect(() => {
    const latest = log[log.length - 1]
    if (!latest || latest.eventId === lastEventId || !battle) {
      return
    }

    setLastEventId(latest.eventId)
    const actorId = typeof latest.metadata?.playerId === 'string' ? latest.metadata.playerId : null
    const actorIsMe = actorId === identity.playerId
    const sourceSetter = actorIsMe ? setMyAnimation : setEnemyAnimation
    const targetSetter = actorIsMe ? setEnemyAnimation : setMyAnimation

    if (latest.eventType === 'MOVE_HIT') {
      sourceSetter('attack')
      targetSetter('damage')
    } else if (latest.eventType === 'SWITCH' || latest.eventType === 'AUTO_SWITCH') {
      sourceSetter('switch')
    } else if (latest.eventType === 'STATUS_DAMAGE' || latest.eventType === 'FAINT') {
      targetSetter('damage')
    }

    const timer = setTimeout(() => {
      setMyAnimation(null)
      setEnemyAnimation(null)
    }, 780)

    return () => clearTimeout(timer)
  }, [battle, identity.playerId, lastEventId, log])

  const me = battle?.turnSnapshot.players.find((player) => player.playerId === identity.playerId)
  const enemy = battle?.turnSnapshot.players.find((player) => player.playerId !== identity.playerId)
  const myActive = me ? me.team[me.activePokemonIndex] : null
  const alreadySubmitted = battle?.pendingActions.some((action) => action.playerId === identity.playerId) ?? false
  const actionsDisabled =
    isSubmitting || alreadySubmitted || !battle || battle.phase === 'finished' || myActive?.currentHp === 0
  const showActionButtons = !actionsDisabled
  const latestMessages = log.slice(-2).map((entry) => entry.message)

  useEffect(() => {
    if (showActionButtons) {
      setActionPanel('menu')
    }
  }, [showActionButtons, battle?.turn])

  useEffect(() => {
    if (!myActive) {
      return
    }

    const missingMoves = myActive.battleMoveIds.filter(
      (moveId) => !moveCatalog[moveId] && !requestedMoveIds.current.has(moveId),
    )
    if (missingMoves.length === 0) {
      return
    }

    missingMoves.forEach((moveId) => requestedMoveIds.current.add(moveId))
    let active = true

    const loadMoves = async () => {
      try {
        const response = await getMoveCatalogApi(missingMoves)
        if (!active) {
          return
        }
        setMoveCatalog((prev) => {
          const next = { ...prev }
          response.items.forEach((item) => {
            next[item.name] = item
          })
          return next
        })
      } catch (error) {
        if (error instanceof ApiError) {
          uiStore.pushNotice('error', `${error.code}: ${error.message}`)
        }
      }
    }

    void loadMoves()
    return () => {
      active = false
    }
  }, [myActive, moveCatalog])

  const submitMove = async (moveId: string) => {
    if (!battle) {
      return
    }

    try {
      setIsSubmitting(true)
      const result = await submitBattleActionApi(battle.roomCode, {
        playerId: identity.playerId,
        action: { type: 'move', moveId },
      })
      battleStore.setBattle(result.battle)
      if (result.battle.winner) {
        await navigate({ to: '/result/$code', params: { code: normalizedCode } })
      }
    } catch (error) {
      if (error instanceof ApiError) {
        uiStore.pushNotice('error', `${error.code}: ${error.message}`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitForfeit = async () => {
    if (!battle) return
    try {
      setIsSubmitting(true)
      setForfeitConfirm(false)
      const result = await forfeitBattleApi(battle.roomCode, { playerId: identity.playerId })
      battleStore.setBattle(result)
      await navigate({ to: '/result/$code', params: { code: normalizedCode } })
    } catch (error) {
      if (error instanceof ApiError) {
        uiStore.pushNotice('error', `${error.code}: ${error.message}`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitSwitch = async (nextActivePokemonIndex: number) => {
    if (!battle) {
      return
    }

    try {
      setIsSubmitting(true)
      const result = await submitBattleActionApi(battle.roomCode, {
        playerId: identity.playerId,
        action: { type: 'switch', nextActivePokemonIndex },
      })
      battleStore.setBattle(result.battle)
    } catch (error) {
      if (error instanceof ApiError) {
        uiStore.pushNotice('error', `${error.code}: ${error.message}`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!battle || !me || !enemy || !myActive) {
    return (
      <main className="page-wrap px-4 pb-8 pt-10">
        <section className="island-shell rounded-2xl p-6">
          <h1 className="text-2xl font-bold">Cargando batalla...</h1>
        </section>
      </main>
    )
  }

  return (
    <main className="page-wrap battle-page px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4">
      <section className="battle-page-header flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-bold text-[var(--sea-ink)]">Batalla sala {normalizedCode}</h1>
        <div className="flex items-center gap-3">
          <p className="m-0 text-sm text-[var(--sea-ink-soft)]">
            Turno {battle.turn} · {alreadySubmitted ? 'Acción enviada' : 'Tu turno'}
          </p>
          {forfeitConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-rose-700">¿Rendirse?</span>
              <button
                type="button"
                onClick={submitForfeit}
                disabled={isSubmitting}
                className="rounded-lg border border-rose-300 bg-rose-100 px-3 py-1 text-sm font-semibold text-rose-800 disabled:opacity-50"
              >
                Sí
              </button>
              <button
                type="button"
                onClick={() => setForfeitConfirm(false)}
                className="rounded-lg border border-[var(--line)] bg-white px-3 py-1 text-sm"
              >
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setForfeitConfirm(true)}
              disabled={battle.phase === 'finished'}
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-1 text-sm font-semibold text-rose-700 disabled:opacity-50"
            >
              Rendirse
            </button>
          )}
        </div>
      </section>
      {alreadySubmitted ? (
        <p className="battle-page-notice m-0 rounded-lg border border-sky-300/70 bg-sky-50/70 px-3 py-2 text-sm text-sky-900">
          Ya enviaste acción en este turno. Esperando al oponente...
        </p>
      ) : null}

      <div className="battle-stage">
        <BattleField
          me={me}
          enemy={enemy}
          myAnimation={myAnimation}
          enemyAnimation={enemyAnimation}
          myShiny={useShiny}
          battleConsole={
            <section className="battle-console-shell">
              <div className="battle-console-classic">
                <div className="battle-message-box">
                  {latestMessages.length > 0 ? (
                    latestMessages.map((message, index) => (
                      <p key={`${message}-${index}`} className="m-0">
                        {message}
                      </p>
                    ))
                  ) : (
                    <p className="m-0">¿Qué hará {myActive.name}?</p>
                  )}
                </div>

                <div className="battle-main-menu">
                  {actionPanel === 'menu' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setActionPanel('move')}
                        className="battle-command-btn battle-command-btn-fight"
                        disabled={!showActionButtons}
                      >
                        Luchar
                      </button>
                      <button
                        type="button"
                        onClick={() => setActionPanel('switch')}
                        className="battle-command-btn battle-command-btn-pokemon"
                        disabled={!showActionButtons}
                      >
                        Pokémon
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              {showActionButtons ? (
                actionPanel === 'move' ? (
                  <div className="battle-actions-grid mt-2">
                    {myActive.battleMoveIds.map((moveId) => (
                      <MoveButton
                        key={moveId}
                        moveId={moveId}
                        moveType={moveCatalog[moveId]?.type}
                        disabled={actionsDisabled}
                        onClick={() => submitMove(moveId)}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => setActionPanel('menu')}
                      className="battle-switch-option px-3 py-2 text-left text-sm"
                    >
                      Volver
                    </button>
                  </div>
                ) : actionPanel === 'switch' ? (
                  <div className="battle-actions-grid mt-2">
                    {me.team.map((pokemon, index) => (
                      <button
                        type="button"
                        key={`${pokemon.pokemonId}-${index}`}
                        onClick={() => submitSwitch(index)}
                        disabled={
                          actionsDisabled ||
                          index === me.activePokemonIndex ||
                          pokemon.currentHp <= 0
                        }
                        className="battle-switch-option px-3 py-2 text-left text-sm disabled:opacity-50"
                      >
                        <div className="battle-switch-row">
                          <span className="battle-switch-name">
                            {pokemon.name} ({pokemon.currentHp}/{pokemon.maxHp})
                          </span>
                          <TypeBadges types={pokemon.types} className="type-badges--compact" />
                        </div>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setActionPanel('menu')}
                      className="battle-switch-option px-3 py-2 text-left text-sm"
                    >
                      Volver
                    </button>
                  </div>
                ) : null
              ) : (
                <p className="battle-waiting-text m-0 px-1 py-2 text-sm">
                  Esperando resolución del turno...
                </p>
              )}
            </section>
          }
        />
      </div>
    </main>
  )
}
