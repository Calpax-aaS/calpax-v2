/**
 * Flèche de vent — direction en degrés (0 = Nord), vitesse dans l'unité
 * demandée par l'appelant (par défaut kt). Une barbule supplémentaire
 * apparaît au-dessus de 12 kt d'intensité relative (pour illustrer fort
 * vent, peu importe l'unité affichée).
 */
export function WindArrow({
  direction = 0,
  speed = 0,
  size = 22,
  unit = 'kt',
  label,
  className,
}: {
  direction?: number
  speed?: number
  size?: number
  unit?: string
  /** Override complet du aria-label. Si omis, construit depuis speed/unit/direction. */
  label?: string
  className?: string
}) {
  const intensity = Math.min(1, speed / 25)
  const ariaLabel = label ?? `${Math.round(speed)} ${unit}, ${Math.round(direction)}°`
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      role="img"
      aria-label={ariaLabel}
    >
      <g transform={`rotate(${direction} 12 12)`}>
        <line x1="12" y1="20" x2="12" y2="5" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M8 9 L12 5 L16 9"
          stroke="currentColor"
          strokeWidth="1.4"
          fill="none"
          strokeLinejoin="round"
        />
        {intensity > 0.5 && (
          <>
            <line x1="10" y1="14" x2="12" y2="12" stroke="currentColor" strokeWidth="1.2" />
            <line x1="14" y1="14" x2="12" y2="12" stroke="currentColor" strokeWidth="1.2" />
          </>
        )}
      </g>
    </svg>
  )
}
