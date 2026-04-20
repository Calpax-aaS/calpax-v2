/**
 * Flèche de vent — direction en degrés (0 = Nord), vitesse en nœuds.
 * Une barbule supplémentaire apparaît au-dessus de 12 kt (intensité).
 */
export function WindArrow({
  direction = 0,
  speed = 0,
  size = 22,
  className,
}: {
  direction?: number
  speed?: number
  size?: number
  className?: string
}) {
  const intensity = Math.min(1, speed / 25)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-label={`Vent ${Math.round(speed)}kt ${Math.round(direction)}°`}
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
