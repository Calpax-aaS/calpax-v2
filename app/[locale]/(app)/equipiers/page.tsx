import { getTranslations } from 'next-intl/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { getContext } from '@/lib/context'
import { db } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>

        <EquipierCreateForm locale={locale} />

        {equipiers.length === 0 ? (
          <p className="text-muted-foreground">{t('noEntries')}</p>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t('fields.prenom')}
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t('fields.nom')}
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t('fields.telephone')}
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t('fields.statut')}
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t('fields.actions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipiers.map((e) => (
                    <TableRow key={e.id} className="hover:bg-muted/50">
                      <TableCell>{e.prenom}</TableCell>
                      <TableCell className="font-medium">{e.nom}</TableCell>
                      <TableCell>{e.telephone ?? '--'}</TableCell>
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
            </CardContent>
          </Card>
        )}
      </div>
    )
  })
}
