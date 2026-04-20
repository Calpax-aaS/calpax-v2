import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

type Props = {
  rows?: number
  columnWidths: string[]
}

export function ListSkeleton({ rows = 5, columnWidths }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-10 w-32" />
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-2">
              {columnWidths.map((w, j) => (
                <Skeleton key={j} className={`h-5 ${w}`} />
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
