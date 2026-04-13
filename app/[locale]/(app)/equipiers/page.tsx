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
import { EquipierCreateForm } from './equipier-create-form'
import { ToggleActifButton } from '@/components/toggle-actif-button'
import { toggleEquipierActif } from '@/lib/actions/equipier'

type Props = {
  params: Promise<{ locale: string }>
}

export default async function EquipiersPage({ params }: Props) {
  const { locale } = await params
  return requireAuth(async () => {
    const t = await getTranslations('equipiers')
    const ctx = getContext()

    const equipiers = await db.equipier.findMany({
      where: { exploitantId: ctx.exploitantId },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    })

    return (
      <main className="container mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>

        <EquipierCreateForm locale={locale} />

        {equipiers.length === 0 ? (
          <p className="text-muted-foreground">{t('noEntries')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('fields.prenom')}</TableHead>
                <TableHead>{t('fields.nom')}</TableHead>
                <TableHead>{t('fields.telephone')}</TableHead>
                <TableHead>{t('fields.statut')}</TableHead>
                <TableHead>{t('fields.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipiers.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.prenom}</TableCell>
                  <TableCell className="font-medium">{e.nom}</TableCell>
                  <TableCell>{e.telephone ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={e.actif ? 'default' : 'secondary'}>
                      {e.actif ? t('status.actif') : t('status.inactif')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ToggleActifButton
                      id={e.id}
                      actif={e.actif}
                      locale={locale}
                      action={toggleEquipierActif}
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
