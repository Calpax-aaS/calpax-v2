/**
 * Sparkline lineaire — courbe de vent sur la journee, tendance remplissage, etc.
 */
export function Sparkline({
  data,
  width = 80,
  height = 22,
  color = 'var(--ink-500)',
  fill = 'rgba(27,58,94,0.1)',
  className,
}: {
  data: number[]
  width?: number
  height?: number
  color?: string
  fill?: string
  className?: string
}) {
  if (data.length === 0) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const step = width / (data.length - 1 || 1)
  const points = data.map(
    (value, index) => [index * step, height - ((value - min) / range) * height] as const,
  )
  const linePath = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ')
  const areaPath = `${linePath} L${width} ${height} L0 ${height} Z`
  return (
    <svg width={width} height={height} className={className} aria-hidden>
      <path d={areaPath} fill={fill} />
      <path d={linePath} stroke={color} strokeWidth="1.3" fill="none" />
    </svg>
  )
}
