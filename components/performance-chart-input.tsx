'use client'

interface PerformanceChartInputProps {
  defaultValues?: Record<string, number>
}

const TEMPERATURES = Array.from({ length: 25 }, (_, i) => i + 10) // 10 to 34

export function PerformanceChartInput({ defaultValues = {} }: PerformanceChartInputProps) {
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
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
            {TEMPERATURES.map((t) => (
              <tr key={t} className="hover:bg-muted/50">
                <td className="border border-border px-3 py-1.5 font-medium text-muted-foreground">
                  {t}°C
                </td>
                <td className="border border-border px-3 py-1.5">
                  <input
                    type="number"
                    name={`chart_${t}`}
                    defaultValue={defaultValues[String(t)] ?? ''}
                    step="1"
                    min="0"
                    placeholder="—"
                    className="w-full bg-transparent outline-none focus:ring-1 focus:ring-ring rounded px-1 py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
