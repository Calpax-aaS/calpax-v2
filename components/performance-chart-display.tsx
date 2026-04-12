interface PerformanceChartDisplayProps {
  chart: Record<string, number>
}

const TEMPERATURES = Array.from({ length: 25 }, (_, i) => i + 10) // 10 to 34

export function PerformanceChartDisplay({ chart }: PerformanceChartDisplayProps) {
  const entries = TEMPERATURES.filter((t) => chart[String(t)] != null)

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground italic">Aucune donnée saisie.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="text-sm border-collapse">
        <thead>
          <tr className="bg-muted">
            <th className="border border-border px-3 py-2 text-left font-medium w-32">
              Temp. (°C)
            </th>
            <th className="border border-border px-3 py-2 text-left font-medium">
              Charge utile max (kg)
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((t) => (
            <tr key={t} className="hover:bg-muted/50">
              <td className="border border-border px-3 py-1.5 font-medium text-muted-foreground">
                {t}°C
              </td>
              <td className="border border-border px-3 py-1.5">{chart[String(t)]} kg</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
