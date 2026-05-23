import TypeBadges from './TypeBadges'

type MoveButtonProps = {
  moveId: string
  moveType?: string
  disabled?: boolean
  onClick: () => void
  className?: string
}

export default function MoveButton({ moveId, moveType, disabled, onClick, className }: MoveButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`battle-move-option px-3 py-2 text-left text-sm font-semibold text-[var(--sea-ink)] disabled:cursor-not-allowed disabled:opacity-45 ${className ?? ''}`.trim()}
    >
      <div className="battle-move-option-content">
        <span className="battle-move-option-label">{moveId}</span>
        {moveType ? (
          <TypeBadges types={[moveType]} className="type-badges--compact" badgeClassName="type-badge--move" />
        ) : null}
      </div>
    </button>
  )
}
