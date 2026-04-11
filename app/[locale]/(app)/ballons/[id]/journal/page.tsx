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
import type { StatutVol } from '@prisma/client'

type Props = {
  params: Promise<{ locale: string; id: string }>
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function statutVariant(statut: StatutVol): 'outline' | 'default' | 'secondary' | 'destructive' {
  switch (statut) {
    case 'PLANIFIE':
    case 'CONFIRME':
      return 'default'
    case 'TERMINE':
      return 'secondary'
    case 'ARCHIVE':
      return 'outline'
    case 'ANNULE':
      return 'destructive'
    default:
      return 'outline'
  }
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
      <main className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}/ballons/${id}`}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            {ballon.nom} ({ballon.immatriculation})
          </Link>
          <h1 className="text-2xl font-bold">{tJournal('title')}</h1>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tVols('fields.date')}</TableHead>
                <TableHead>{tVols('fields.creneau')}</TableHead>
                <TableHead>{tVols('fields.pilote')}</TableHead>
                <TableHead>{tVols('fields.statut')}</TableHead>
                <TableHead>{tVols('postVol.decoLieu')}</TableHead>
                <TableHead>{tVols('postVol.atterLieu')}</TableHead>
                <TableHead>{tVols('postVol.distance')}</TableHead>
                <TableHead>{tVols('postVol.gasConso')}</TableHead>
                <TableHead>{tVols('postVol.anomalies')}</TableHead>
                <TableHead>PVE</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vols.map((vol) => (
                <TableRow key={vol.id}>
                  <TableCell className="whitespace-nowrap">
                    <Link
                      href={`/${locale}/vols/${vol.id}`}
                      className="underline underline-offset-4 hover:text-primary"
                    >
                      {formatDate(vol.date)}
                    </Link>
                  </TableCell>
                  <TableCell>{tVols(`creneau.${vol.creneau}`)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {vol.pilote.prenom} {vol.pilote.nom}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statutVariant(vol.statut)}>
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
        )}
      </main>
    )
  })
}
