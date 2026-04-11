import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth/requireAuth'
import { getContext } from '@/lib/context'
import { db } from '@/lib/db'
import { buttonVariants } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { StatutBillet, StatutPaiement } from '@prisma/client'

type Props = {
  params: Promise<{ locale: string }>
}

function formatCentimes(centimes: number): string {
  return (centimes / 100).toFixed(2) + ' EUR'
}

function statutVariant(statut: StatutBillet): 'outline' | 'default' | 'secondary' | 'destructive' {
  switch (statut) {
    case 'EN_ATTENTE':
      return 'outline'
    case 'PLANIFIE':
      return 'default'
    case 'VOLE':
      return 'secondary'
    case 'ANNULE':
    case 'REMBOURSE':
    case 'EXPIRE':
      return 'destructive'
    default:
      return 'outline'
  }
}

function statutPaiementVariant(
  statut: StatutPaiement,
): 'outline' | 'default' | 'secondary' | 'destructive' {
  switch (statut) {
    case 'EN_ATTENTE':
      return 'outline'
    case 'SOLDE':
      return 'default'
    case 'PARTIEL':
      return 'secondary'
    case 'REMBOURSE':
      return 'destructive'
    default:
      return 'outline'
  }
}

export default async function BilletsPage({ params }: Props) {
  const { locale } = await params
  return requireAuth(async () => {
    const t = await getTranslations('billets')
    const ctx = getContext()

    const billets = await db.billet.findMany({
      where: { exploitantId: ctx.exploitantId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { passagers: true } } },
    })

    return (
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <Link href={`/${locale}/billets/new`} className={cn(buttonVariants({ size: 'sm' }))}>
            {t('new')}
          </Link>
        </div>

        {billets.length === 0 ? (
          <p className="text-muted-foreground">{t('noBillets')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('fields.reference')}</TableHead>
                <TableHead>{t('fields.payeurNom')}</TableHead>
                <TableHead>Passagers</TableHead>
                <TableHead>{t('fields.montantTtc')}</TableHead>
                <TableHead>{t('fields.statut')}</TableHead>
                <TableHead>{t('fields.statutPaiement')}</TableHead>
                <TableHead>{t('fields.typePlannif')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billets.map((billet) => (
                <TableRow key={billet.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/${locale}/billets/${billet.id}`}
                      className="underline underline-offset-4 hover:text-primary"
                    >
                      {billet.reference}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {billet.payeurPrenom} {billet.payeurNom}
                  </TableCell>
                  <TableCell>{billet._count.passagers}</TableCell>
                  <TableCell>{formatCentimes(billet.montantTtc)}</TableCell>
                  <TableCell>
                    <Badge variant={statutVariant(billet.statut)}>
                      {t(`statut.${billet.statut}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statutPaiementVariant(billet.statutPaiement)}>
                      {t(`statutPaiement.${billet.statutPaiement}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>{t(`typePlannif.${billet.typePlannif}`)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </main>
    )
  })
}
