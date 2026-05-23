import type { BattleLogEntry } from '../lib/api'

type BattleLogProps = {
  entries: BattleLogEntry[]
  className?: string
  embedded?: boolean
}

const CRITICAL_EVENTS = new Set(['BATTLE_END', 'CRITICAL_HIT', 'TYPE_EFFECTIVE', 'STATUS_APPLIED', 'FAINT'])

const getEntryTone = (eventType: string): string => {
  if (eventType === 'BATTLE_END' || eventType === 'FAINT') {
    return 'border-rose-300/60 bg-rose-50/70'
  }

  if (eventType === 'CRITICAL_HIT' || eventType === 'TYPE_EFFECTIVE') {
    return 'border-amber-300/60 bg-amber-50/70'
  }

  if (eventType === 'STATUS_APPLIED' || eventType === 'STATUS_DAMAGE') {
    return 'border-violet-300/60 bg-violet-50/70'
  }

  return 'border-[var(--line)] bg-white/60'
}

export default function BattleLog({ entries, className, embedded = false }: BattleLogProps) {
  const lastEntries = entries.slice(-16).reverse()

  return (
    <section
      className={`${embedded ? 'battle-log-panel' : 'island-shell h-full rounded-2xl p-4'} ${className ?? ''}`.trim()}
    >
      <h3 className="mb-3 text-sm font-bold tracking-wide text-[var(--sea-ink)]">BattleLog</h3>
      <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1 text-sm">
        {lastEntries.length === 0 ? (
          <p className="m-0 text-[var(--sea-ink-soft)]">Sin eventos todavía.</p>
        ) : (
          lastEntries.map((entry) => (
            <article
              key={entry.eventId}
              className={`rounded-lg border px-3 py-2 ${getEntryTone(entry.eventType)} ${
                CRITICAL_EVENTS.has(entry.eventType) ? 'log-critical' : ''
              }`}
            >
              <p className="m-0 text-xs text-[var(--sea-ink-soft)]">
                Turno {entry.turn} · {entry.eventType}
              </p>
              <p className="m-0">{entry.message}</p>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
