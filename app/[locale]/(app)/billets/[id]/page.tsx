import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/requireAuth'
import { requireRole } from '@/lib/auth/requireRole'
import { db } from '@/lib/db'
import { safeDecryptInt } from '@/lib/crypto'
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
import { formatDateFr, formatEuros } from '@/lib/format'
import { statutBilletVariant, statutPaiementVariant } from '@/lib/ui'

type Props = {
  params: Promise<{ locale: string; id: string }>
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return '—'
  return formatDateFr(date)
}

export default async function BilletDetailPage({ params }: Props) {
  const { locale, id } = await params
  return requireAuth(async () => {
    // Billets hold payer contact + decrypted passenger weights — admin/gerant only.
    requireRole('ADMIN_CALPAX', 'GERANT')

    const tBillets = await getTranslations('billets')
    const tPaiements = await getTranslations('paiements')
    const tPassagers = await getTranslations('passagers')

    const billet = await db.billet.findUnique({
      where: { id },
      include: {
        passagers: true,
        paiements: { orderBy: { datePaiement: 'desc' } },
        tags: { include: { tag: true } },
      },
    })
    if (!billet) notFound()

    const totalPaye = billet.paiements.reduce((sum, p) => sum + Number(p.montantTtc), 0)
    const soldeRestant = Number(billet.montantTtc) - totalPaye

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/${locale}/billets`}
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
            >
              {tBillets('backToList')}
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">{billet.reference}</h1>
            <Badge variant={statutBilletVariant(billet.statut)}>
              {tBillets(`statut.${billet.statut}`)}
            </Badge>
            <Badge variant={statutPaiementVariant(billet.statutPaiement)}>
              {tBillets(`statutPaiement.${billet.statutPaiement}`)}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/${locale}/billets/${id}/edit`}
              className={buttonVariants({ variant: 'outline' })}
            >
              {tBillets('edit')}
            </Link>
          </div>
        </div>

        {billet.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {billet.tags.map(({ tag }) => (
              <Badge
                key={tag.id}
                variant="outline"
                style={tag.couleur ? { borderColor: tag.couleur, color: tag.couleur } : undefined}
              >
                {tag.nom}
              </Badge>
            ))}
          </div>
        )}

        {/* Payeur card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payeur</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {tBillets('fields.payeurPrenom')}
              </p>
              <p className="font-medium">
                {billet.payeurCiv ? `${billet.payeurCiv} ` : ''}
                {billet.payeurPrenom} {billet.payeurNom}
              </p>
            </div>
            {billet.payeurEmail && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {tBillets('fields.payeurEmail')}
                </p>
                <p className="font-medium">{billet.payeurEmail}</p>
              </div>
            )}
            {billet.payeurTelephone && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {tBillets('fields.payeurTelephone')}
                </p>
                <p className="font-medium">{billet.payeurTelephone}</p>
              </div>
            )}
            {(billet.payeurAdresse || billet.payeurCp || billet.payeurVille) && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {tBillets('fields.payeurAdresse')}
                </p>
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
          <CardContent className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {tBillets('fields.typePlannif')}
              </p>
              <p className="font-medium">{tBillets(`typePlannif.${billet.typePlannif}`)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {tBillets('fields.montantTtc')}
              </p>
              <p className="font-medium">{formatEuros(Number(billet.montantTtc))}</p>
            </div>
            {billet.dateVolDeb && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {tBillets('fields.dateVolDeb')}
                </p>
                <p className="font-medium">{formatDate(billet.dateVolDeb)}</p>
              </div>
            )}
            {billet.dateVolFin && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {tBillets('fields.dateVolFin')}
                </p>
                <p className="font-medium">{formatDate(billet.dateVolFin)}</p>
              </div>
            )}
            {billet.dateValidite && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {tBillets('fields.dateValidite')}
                </p>
                <p className="font-medium">{formatDate(billet.dateValidite)}</p>
              </div>
            )}
            {billet.lieuDecollage && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {tBillets('fields.lieuDecollage')}
                </p>
                <p className="font-medium">{billet.lieuDecollage}</p>
              </div>
            )}
            {billet.survol && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {tBillets('fields.survol')}
                </p>
                <p className="font-medium">{billet.survol}</p>
              </div>
            )}
            {billet.categorie && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {tBillets('fields.categorie')}
                </p>
                <p className="font-medium">{billet.categorie}</p>
              </div>
            )}
            {billet.provenance && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {tBillets('fields.provenance')}
                </p>
                <p className="font-medium">{billet.provenance}</p>
              </div>
            )}
            {billet.commentaire && (
              <div className="col-span-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {tBillets('fields.commentaire')}
                </p>
                <p className="font-medium">{billet.commentaire}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bon cadeau card */}
        {billet.estBonCadeau && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{tBillets('bonCadeau.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {billet.dateCadeau && (
                <div>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    {tBillets('bonCadeau.dateCadeau')}
                  </span>
                  <p className="font-medium">{formatDate(billet.dateCadeau)}</p>
                </div>
              )}
              {billet.destinataireNom && (
                <div>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    {tBillets('bonCadeau.destinataire')}
                  </span>
                  <p className="font-medium">
                    {billet.destinataireNom}
                    {billet.destinataireEmail ? ` (${billet.destinataireEmail})` : ''}
                  </p>
                </div>
              )}
              {billet.organisateurNom && (
                <div>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    {tBillets('bonCadeau.organisateur')}
                  </span>
                  <p className="font-medium">
                    {billet.organisateurNom}
                    {billet.organisateurEmail ? ` (${billet.organisateurEmail})` : ''}
                    {billet.organisateurTelephone ? ` — ${billet.organisateurTelephone}` : ''}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {tPassagers('fields.prenom')}
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {tPassagers('fields.nom')}
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {tPassagers('fields.age')}
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {tPassagers('fields.poids')}
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {tPassagers('fields.pmr')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billet.passagers.map((p) => {
                    const poids = p.poidsEncrypted ? safeDecryptInt(p.poidsEncrypted) : null
                    return (
                      <TableRow key={p.id} className="hover:bg-muted/50">
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
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {tPaiements('fields.datePaiement')}
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {tPaiements('fields.modePaiement')}
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {tPaiements('fields.montantTtc')}
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                      {tPaiements('fields.commentaire')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billet.paiements.map((paiement) => (
                    <TableRow key={paiement.id} className="hover:bg-muted/50">
                      <TableCell>{formatDate(paiement.datePaiement)}</TableCell>
                      <TableCell>{tPaiements(`modes.${paiement.modePaiement}`)}</TableCell>
                      <TableCell className="font-medium">
                        {formatEuros(Number(paiement.montantTtc))}
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
                {formatEuros(soldeRestant)}
              </span>
            </div>

            <PaiementForm billetId={id} locale={locale} />
          </CardContent>
        </Card>
      </div>
    )
  })
}
