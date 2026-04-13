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
import { VehiculeCreateForm } from './vehicule-create-form'
import { ToggleActifButton } from '@/components/toggle-actif-button'
import { toggleVehiculeActif } from '@/lib/actions/vehicule'

type Props = {
  params: Promise<{ locale: string }>
}

export default async function VehiculesPage({ params }: Props) {
  const { locale } = await params
  return requireAuth(async () => {
    const t = await getTranslations('vehicules')
    const ctx = getContext()

    const vehicules = await db.vehicule.findMany({
      where: { exploitantId: ctx.exploitantId },
      orderBy: { nom: 'asc' },
    })

    return (
      <main className="container mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>

        <VehiculeCreateForm locale={locale} />

        {vehicules.length === 0 ? (
          <p className="text-muted-foreground">{t('noEntries')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('fields.nom')}</TableHead>
                <TableHead>{t('fields.immatriculation')}</TableHead>
                <TableHead>{t('fields.statut')}</TableHead>
                <TableHead>{t('fields.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicules.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.nom}</TableCell>
                  <TableCell>{v.immatriculation ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={v.actif ? 'default' : 'secondary'}>
                      {v.actif ? t('status.actif') : t('status.inactif')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ToggleActifButton
                      id={v.id}
                      actif={v.actif}
                      locale={locale}
                      action={toggleVehiculeActif}
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
