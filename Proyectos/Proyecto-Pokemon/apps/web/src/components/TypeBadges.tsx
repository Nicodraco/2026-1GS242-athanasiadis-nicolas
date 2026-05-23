type TypeBadgesProps = {
  types: string[]
  className?: string
  badgeClassName?: string
}

const formatTypeLabel = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

export default function TypeBadges({ types, className, badgeClassName }: TypeBadgesProps) {
  const normalized = Array.from(
    new Set(
      types
        .map((type) => type.trim().toLowerCase())
        .filter((type) => type.length > 0),
    ),
  )

  if (normalized.length === 0) {
    return null
  }

  return (
    <div className={`type-badges ${className ?? ''}`.trim()}>
      {normalized.map((type) => (
        <span
          key={type}
          className={`type-badge ${badgeClassName ?? ''}`.trim()}
          data-type={type}
        >
          {formatTypeLabel(type)}
        </span>
      ))}
    </div>
  )
}
