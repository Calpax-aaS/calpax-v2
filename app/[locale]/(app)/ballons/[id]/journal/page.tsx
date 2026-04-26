import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { formatDateFr } from '@/lib/format'
import { statutVolVariant } from '@/lib/ui'

type Props = {
  params: Promise<{ locale: string; id: string }>
}

function truncate(text: string | null, max: number): string {
  if (!text) return '—'
  return text.length > max ? text.slice(0, max) + '…' : text
}

export default async function BallonJournalPage({ params }: Props) {
  const { locale, id } = await params
  return requireAuth(async () => {
    const tJournal = await getTranslations('journal')
    const tVols = await getTranslations('vols')

    const ballon = await db.ballon.findUnique({ where: { id } })
    if (!ballon) notFound()

    const vols = await db.vol.findMany({
      where: { ballonId: id, statut: { not: 'ANNULE' } },
      include: { pilote: { select: { prenom: true, nom: true } } },
      orderBy: { date: 'desc' },
    })

    const totalVols = vols.length
    const totalGaz = vols.reduce((sum, v) => sum + (v.gasConso ?? 0), 0)
    const volsArchives = vols.filter((v) => v.statut === 'ARCHIVE').length

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}/ballons/${id}`}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            {ballon.nom} ({ballon.immatriculation})
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">{tJournal('title')}</h1>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {tJournal('stats.totalVols')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalVols}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {tJournal('stats.totalGaz')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalGaz}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {tJournal('stats.volsArchives')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{volsArchives}</p>
            </CardContent>
          </Card>
        </div>

        {vols.length === 0 ? (
          <p className="text-muted-foreground">{tJournal('noVols')}</p>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {tVols('fields.date')}
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {tVols('fields.creneau')}
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {tVols('fields.pilote')}
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {tVols('fields.statut')}
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {tVols('postVol.decoLieu')}
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {tVols('postVol.atterLieu')}
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {tVols('postVol.distance')}
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {tVols('postVol.gasConso')}
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {tVols('postVol.anomalies')}
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      PVE
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vols.map((vol) => (
                    <TableRow key={vol.id} className="hover:bg-muted/50">
                      <TableCell className="whitespace-nowrap">
                        <Link
                          href={`/${locale}/vols/${vol.id}`}
                          className="underline underline-offset-4 hover:text-primary"
                        >
                          {formatDateFr(vol.date)}
                        </Link>
                      </TableCell>
                      <TableCell>{tVols(`creneau.${vol.creneau}`)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {vol.pilote.prenom} {vol.pilote.nom}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statutVolVariant(vol.statut)}>
                          {tVols(`statut.${vol.statut}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>{vol.decoLieu ?? '—'}</TableCell>
                      <TableCell>{vol.atterLieu ?? '—'}</TableCell>
                      <TableCell>{vol.distance !== null ? `${vol.distance} km` : '—'}</TableCell>
                      <TableCell>{vol.gasConso !== null ? `${vol.gasConso} kg` : '—'}</TableCell>
                      <TableCell className="max-w-[180px] text-sm text-muted-foreground">
                        {truncate(vol.anomalies, 60)}
                      </TableCell>
                      <TableCell>
                        {vol.pvePdfUrl ? (
                          <a
                            href={`/api/vols/${vol.id}/pve`}
                            className="underline underline-offset-4 hover:text-primary text-sm"
                            target="_blank"
                            rel="noreferrer"
                          >
                            PVE
                          </a>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    )
  })
}
