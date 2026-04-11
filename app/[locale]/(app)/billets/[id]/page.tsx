import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
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
import { PaiementForm } from '@/components/paiement-form'
import { cn } from '@/lib/utils'
import type { StatutBillet, StatutPaiement } from '@prisma/client'

type Props = {
  params: Promise<{ locale: string; id: string }>
}

function formatCentimes(centimes: number): string {
  return (centimes / 100).toFixed(2) + ' EUR'
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return '—'
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function safeDecrypt(encrypted: string | null | undefined): number | null {
  if (!encrypted) return null
  try {
    return parseInt(decrypt(encrypted))
  } catch {
    return null
  }
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

export default async function BilletDetailPage({ params }: Props) {
  const { locale, id } = await params
  return requireAuth(async () => {
    const tBillets = await getTranslations('billets')
    const tPaiements = await getTranslations('paiements')
    const tPassagers = await getTranslations('passagers')

    const billet = await db.billet.findUnique({
      where: { id },
      include: {
        passagers: true,
        paiements: { orderBy: { datePaiement: 'desc' } },
      },
    })
    if (!billet) notFound()

    const totalPaye = billet.paiements.reduce((sum, p) => sum + p.montantTtc, 0)
    const soldeRestant = billet.montantTtc - totalPaye

    return (
      <main className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 flex-wrap">
          <Link
            href={`/${locale}/billets`}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            {tBillets('backToList')}
          </Link>
          <h1 className="text-2xl font-bold">{billet.reference}</h1>
          <Badge variant={statutVariant(billet.statut)}>
            {tBillets(`statut.${billet.statut}`)}
          </Badge>
          <Badge variant={statutPaiementVariant(billet.statutPaiement)}>
            {tBillets(`statutPaiement.${billet.statutPaiement}`)}
          </Badge>
        </div>

        <div className="flex justify-end">
          <Link
            href={`/${locale}/billets/${id}/edit`}
            className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}
          >
            {tBillets('edit')}
          </Link>
        </div>

        {/* Payeur card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payeur</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">{tBillets('fields.payeurPrenom')}</p>
              <p className="font-medium">
                {billet.payeurCiv ? `${billet.payeurCiv} ` : ''}
                {billet.payeurPrenom} {billet.payeurNom}
              </p>
            </div>
            {billet.payeurEmail && (
              <div>
                <p className="text-muted-foreground">{tBillets('fields.payeurEmail')}</p>
                <p className="font-medium">{billet.payeurEmail}</p>
              </div>
            )}
            {billet.payeurTelephone && (
              <div>
                <p className="text-muted-foreground">{tBillets('fields.payeurTelephone')}</p>
                <p className="font-medium">{billet.payeurTelephone}</p>
              </div>
            )}
            {(billet.payeurAdresse || billet.payeurCp || billet.payeurVille) && (
              <div>
                <p className="text-muted-foreground">{tBillets('fields.payeurAdresse')}</p>
                <p className="font-medium">
                  {[billet.payeurAdresse, billet.payeurCp, billet.payeurVille]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Planification card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Planification</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">{tBillets('fields.typePlannif')}</p>
              <p className="font-medium">{tBillets(`typePlannif.${billet.typePlannif}`)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{tBillets('fields.montantTtc')}</p>
              <p className="font-medium">{formatCentimes(billet.montantTtc)}</p>
            </div>
            {billet.dateVolDeb && (
              <div>
                <p className="text-muted-foreground">{tBillets('fields.dateVolDeb')}</p>
                <p className="font-medium">{formatDate(billet.dateVolDeb)}</p>
              </div>
            )}
            {billet.dateVolFin && (
              <div>
                <p className="text-muted-foreground">{tBillets('fields.dateVolFin')}</p>
                <p className="font-medium">{formatDate(billet.dateVolFin)}</p>
              </div>
            )}
            {billet.dateValidite && (
              <div>
                <p className="text-muted-foreground">{tBillets('fields.dateValidite')}</p>
                <p className="font-medium">{formatDate(billet.dateValidite)}</p>
              </div>
            )}
            {billet.lieuDecollage && (
              <div>
                <p className="text-muted-foreground">{tBillets('fields.lieuDecollage')}</p>
                <p className="font-medium">{billet.lieuDecollage}</p>
              </div>
            )}
            {billet.survol && (
              <div>
                <p className="text-muted-foreground">{tBillets('fields.survol')}</p>
                <p className="font-medium">{billet.survol}</p>
              </div>
            )}
            {billet.categorie && (
              <div>
                <p className="text-muted-foreground">{tBillets('fields.categorie')}</p>
                <p className="font-medium">{billet.categorie}</p>
              </div>
            )}
            {billet.provenance && (
              <div>
                <p className="text-muted-foreground">{tBillets('fields.provenance')}</p>
                <p className="font-medium">{billet.provenance}</p>
              </div>
            )}
            {billet.commentaire && (
              <div className="col-span-2">
                <p className="text-muted-foreground">{tBillets('fields.commentaire')}</p>
                <p className="font-medium">{billet.commentaire}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Passagers card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Passagers ({billet.passagers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {billet.passagers.length === 0 ? (
              <p className="text-muted-foreground text-sm">{tBillets('noPassengers')}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tPassagers('fields.prenom')}</TableHead>
                    <TableHead>{tPassagers('fields.nom')}</TableHead>
                    <TableHead>{tPassagers('fields.age')}</TableHead>
                    <TableHead>{tPassagers('fields.poids')}</TableHead>
                    <TableHead>{tPassagers('fields.pmr')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billet.passagers.map((p) => {
                    const poids = safeDecrypt(p.poidsEncrypted)
                    return (
                      <TableRow key={p.id}>
                        <TableCell>{p.prenom}</TableCell>
                        <TableCell>{p.nom}</TableCell>
                        <TableCell>{p.age ?? '—'}</TableCell>
                        <TableCell>{poids !== null ? `${poids} kg` : '—'}</TableCell>
                        <TableCell>{p.pmr ? 'Oui' : 'Non'}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Paiements card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{tPaiements('title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {billet.paiements.length === 0 ? (
              <p className="text-muted-foreground text-sm">{tPaiements('noPaiements')}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tPaiements('fields.datePaiement')}</TableHead>
                    <TableHead>{tPaiements('fields.modePaiement')}</TableHead>
                    <TableHead>{tPaiements('fields.montantTtc')}</TableHead>
                    <TableHead>{tPaiements('fields.commentaire')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billet.paiements.map((paiement) => (
                    <TableRow key={paiement.id}>
                      <TableCell>{formatDate(paiement.datePaiement)}</TableCell>
                      <TableCell>{tPaiements(`modes.${paiement.modePaiement}`)}</TableCell>
                      <TableCell className="font-medium">
                        {formatCentimes(paiement.montantTtc)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {paiement.commentaire ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <div className="flex items-center justify-between pt-2 border-t text-sm">
              <span className="text-muted-foreground">{tPaiements('solde')}</span>
              <span className={cn('font-semibold', soldeRestant > 0 ? 'text-destructive' : '')}>
                {formatCentimes(soldeRestant)}
              </span>
            </div>

            <PaiementForm billetId={id} locale={locale} />
          </CardContent>
        </Card>
      </main>
    )
  })
}
