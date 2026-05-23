import type { ReactNode } from 'react'
import type { BattlePlayerState } from '../lib/api'
import { getPokemonSpriteUrls, getPokemonStaticSpriteUrls } from '../lib/pokemonSprites'
import HealthBar from './HealthBar'

type BattleFieldProps = {
  me: BattlePlayerState
  enemy: BattlePlayerState
  myAnimation?: 'attack' | 'damage' | 'switch' | null
  enemyAnimation?: 'attack' | 'damage' | 'switch' | null
  myShiny?: boolean
  battleConsole?: ReactNode
}

const getActive = (player: BattlePlayerState) => player.team[player.activePokemonIndex]
const formatName = (name: string) => name.charAt(0).toUpperCase() + name.slice(1)

const STATUS_LABELS: Record<string, string> = {
  burn: 'Quemado',
  poison: 'Envenenado',
  paralysis: 'Parálisis',
}

function StatusBadges({ player }: { player: BattlePlayerState }) {
  const active = getActive(player)
  if (!active || active.statusEffects.length === 0) {
    return <p className="m-0 text-xs text-[var(--sea-ink-soft)]">Sin estados activos</p>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {active.statusEffects.map((status, index) => (
        <span
          key={`${status.kind}-${index}`}
          className="rounded-full border border-violet-300/60 bg-violet-100/70 px-1.5 py-0.5 text-[9px] font-semibold text-violet-900"
        >
          {STATUS_LABELS[status.kind] ?? status.kind} · {status.remainingTurns}T
        </span>
      ))}
    </div>
  )
}

function PokemonHud({
  title,
  player,
  className,
}: {
  title: string
  player: BattlePlayerState
  className?: string
}) {
  const active = getActive(player)
  if (!active) {
    return null
  }
  const primaryType = active.types[0]?.toLowerCase() ?? ''

  return (
    <article className={`battle-hud ${className ?? ''}`}>
      <p className="island-kicker mb-1">{title}</p>
      <h3 className="m-0 text-base font-bold type-text" data-type={primaryType || undefined}>
        {formatName(active.name)}
      </h3>
      <p className="mt-1 text-xs text-[var(--sea-ink-soft)]">Tipos: {active.types.join(', ')}</p>
      <div className="mt-2">
        <HealthBar current={active.currentHp} max={active.maxHp} />
      </div>
      <div className="mt-1.5">
        <StatusBadges player={player} />
      </div>
    </article>
  )
}

export default function BattleField({
  me,
  enemy,
  myAnimation = null,
  enemyAnimation = null,
  myShiny = false,
  battleConsole,
}: BattleFieldProps) {
  const myActive = getActive(me)
  const enemyActive = getActive(enemy)
  const myFainted = Boolean(myActive && myActive.currentHp <= 0)
  const enemyFainted = Boolean(enemyActive && enemyActive.currentHp <= 0)

  const mySprites = myActive
    ? getPokemonSpriteUrls(myActive.pokemonId, {
        front: myActive.spriteAnimatedFrontUrl ?? myActive.spriteFrontUrl,
        back: myActive.spriteAnimatedBackUrl ?? myActive.spriteBackUrl,
        animated: true,
        preferProvided: !myShiny,
        shiny: myShiny,
      })
    : null
  const enemySprites = enemyActive
    ? getPokemonSpriteUrls(enemyActive.pokemonId, {
        front: enemyActive.spriteAnimatedFrontUrl ?? enemyActive.spriteFrontUrl,
        back: enemyActive.spriteAnimatedBackUrl ?? enemyActive.spriteBackUrl,
        animated: true,
        preferProvided: true,
      })
    : null
  const myStaticSprites = myActive
    ? getPokemonStaticSpriteUrls(myActive.pokemonId, {
        front: myActive.spriteFrontUrl,
        back: myActive.spriteBackUrl,
      })
    : null
  const enemyStaticSprites = enemyActive
    ? getPokemonStaticSpriteUrls(enemyActive.pokemonId, {
        front: enemyActive.spriteFrontUrl,
        back: enemyActive.spriteBackUrl,
      })
    : null
  return (
    <section className="island-shell battle-shell rounded-2xl p-3 sm:p-4">
      <div className="battle-arena battle-layout-grid rounded-2xl border border-[var(--line)] p-3 sm:p-5">
        <div className="battle-quadrant battle-hud-quadrant battle-hud-quadrant-enemy">
          <PokemonHud title="Rival" player={enemy} className="battle-hud-compact battle-hud-enemy" />
        </div>

        <div className="battle-quadrant battle-side battle-side-enemy battle-sprite-quadrant battle-sprite-quadrant-enemy">
          <div
            className={`battle-sprite-wrap ${enemyAnimation ? `battle-${enemyAnimation}` : ''} ${
              enemyFainted ? 'battle-faint' : ''
            }`}
          >
            {enemyAnimation === 'attack' ? <span className="battle-strike battle-strike-enemy" aria-hidden /> : null}
            {enemySprites ? (
              <img
                className="battle-sprite battle-sprite-enemy"
                src={enemySprites.front}
                alt={`Sprite de ${formatName(enemyActive.name)}`}
                onError={(event) => {
                  const current = event.currentTarget
                  const fallbackState = current.dataset.fallbackState ?? 'showdown'
                  if (!enemyStaticSprites) {
                    return
                  }
                  if (fallbackState === 'static') {
                    return
                  }
                  current.dataset.fallbackState = 'static'
                  current.src = enemyStaticSprites.front
                }}
              />
            ) : (
              <p className="text-sm text-[var(--sea-ink-soft)]">Sin sprite</p>
            )}
          </div>
        </div>

        <div className="battle-quadrant battle-side battle-side-ally battle-sprite-quadrant battle-sprite-quadrant-ally">
          <div
            className={`battle-sprite-wrap ${myAnimation ? `battle-${myAnimation}` : ''} ${
              myFainted ? 'battle-faint' : ''
            }`}
          >
            {myAnimation === 'attack' ? <span className="battle-strike battle-strike-ally" aria-hidden /> : null}
            {mySprites ? (
              <img
                className="battle-sprite battle-sprite-ally"
                src={mySprites.back}
                alt={`Sprite de ${formatName(myActive.name)}`}
                onError={(event) => {
                  const current = event.currentTarget
                  const fallbackState = current.dataset.fallbackState ?? 'showdown'
                  if (!myStaticSprites) {
                    return
                  }
                  if (fallbackState === 'static') {
                    return
                  }
                  current.dataset.fallbackState = 'static'
                  current.src = myStaticSprites.back
                }}
              />
            ) : (
              <p className="text-sm text-[var(--sea-ink-soft)]">Sin sprite</p>
            )}
          </div>
        </div>

        <div className="battle-quadrant battle-hud-quadrant battle-hud-quadrant-ally">
          <PokemonHud title="Tu Pokémon" player={me} className="battle-hud-compact battle-hud-ally" />
        </div>
      </div>
      {battleConsole ? <div className="battle-console mt-3">{battleConsole}</div> : null}
    </section>
  )
}

