type HealthBarProps = {
  current: number
  max: number
  label?: string
}

export default function HealthBar({ current, max, label }: HealthBarProps) {
  const safeMax = Math.max(1, max)
  const ratio = Math.max(0, Math.min(100, (current / safeMax) * 100))
  const tone = ratio > 50 ? 'bg-emerald-500' : ratio > 25 ? 'bg-amber-500' : 'bg-rose-500'
  const lowHp = ratio <= 20

  return (
    <div className={`w-full ${lowHp ? 'hp-low' : ''}`}>
      <div className="mb-1 flex items-center justify-between text-xs text-[var(--sea-ink-soft)]">
        <span>{label ?? 'HP'}</span>
        <span>
          {current}/{safeMax}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-300/40">
        <div className={`h-full ${tone} transition-all duration-500`} style={{ width: `${ratio}%` }} />
      </div>
    </div>
  )
}
