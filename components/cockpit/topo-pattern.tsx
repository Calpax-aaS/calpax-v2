'use client'

import { useId } from 'react'

/**
 * Motif de fond "carte aéro" — grille de points espacés, opacité très faible.
 * Utilisé en overlay absolu sur les grandes surfaces colorées (hero login,
 * header dashboard cockpit) pour donner une texture sans charger l'œil.
 */
export function TopoPattern({
  color = 'rgba(27,58,94,0.06)',
  size = 40,
  dot = 0.8,
  className,
}: {
  color?: string
  size?: number
  dot?: number
  className?: string
}) {
  const id = useId()
  return (
    <svg aria-hidden className={className ?? 'pointer-events-none absolute inset-0 h-full w-full'}>
      <defs>
        <pattern id={id} x="0" y="0" width={size} height={size} patternUnits="userSpaceOnUse">
          <circle cx={size / 2} cy={size / 2} r={dot} fill={color} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}
