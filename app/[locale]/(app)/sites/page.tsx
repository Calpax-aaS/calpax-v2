import { getTranslations } from 'next-intl/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { getContext } from '@/lib/context'
import { db } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SiteCreateForm } from './site-create-form'
import { ToggleActifButton } from '@/components/toggle-actif-button'
import { toggleSiteActif } from '@/lib/actions/site-decollage'

type Props = {
  params: Promise<{ locale: string }>
}

export default async function SitesPage({ params }: Props) {
  const { locale } = await params
  return requireAuth(async () => {
    const t = await getTranslations('sites')
    const ctx = getContext()

    const sites = await db.siteDecollage.findMany({
      where: { exploitantId: ctx.exploitantId },
      orderBy: { nom: 'asc' },
    })

    return (
      <main className="container mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>

        <SiteCreateForm locale={locale} />

        {sites.length === 0 ? (
          <p className="text-muted-foreground">{t('noEntries')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('fields.nom')}</TableHead>
                <TableHead>{t('fields.adresse')}</TableHead>
                <TableHead>{t('fields.gps')}</TableHead>
                <TableHead>{t('fields.notes')}</TableHead>
                <TableHead>{t('fields.statut')}</TableHead>
                <TableHead>{t('fields.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.nom}</TableCell>
                  <TableCell>{s.adresse ?? '—'}</TableCell>
                  <TableCell>
                    {s.latitude != null && s.longitude != null
                      ? `${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)}`
                      : '—'}
                  </TableCell>
                  <TableCell className="max-w-48 truncate">{s.notes ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={s.actif ? 'default' : 'secondary'}>
                      {s.actif ? t('status.actif') : t('status.inactif')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ToggleActifButton
                      id={s.id}
                      actif={s.actif}
                      locale={locale}
                      action={toggleSiteActif}
                    />
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
