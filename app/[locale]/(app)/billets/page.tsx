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
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { StatutBillet, StatutPaiement } from '@prisma/client'

type Props = {
  params: Promise<{ locale: string }>
}

function formatEuros(euros: number): string {
  return euros.toFixed(2) + ' EUR'
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <Link
            href={`/${locale}/billets/new`}
            className={cn(buttonVariants({ variant: 'default' }))}
          >
            {t('new')}
          </Link>
        </div>

        {billets.length === 0 ? (
          <p className="text-muted-foreground">{t('noBillets')}</p>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t('fields.reference')}
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t('fields.payeurNom')}
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      Passagers
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t('fields.montantTtc')}
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t('fields.statut')}
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t('fields.statutPaiement')}
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t('fields.typePlannif')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billets.map((billet) => (
                    <TableRow key={billet.id} className="hover:bg-muted/50">
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
                      <TableCell>{formatEuros(Number(billet.montantTtc))}</TableCell>
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
            </CardContent>
          </Card>
        )}
      </div>
    )
  })
}
