'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { affecterBillet, affecterPassager } from '@/lib/actions/organisation'

type Passager = {
  id: string
  prenom: string
  nom: string
  poids: number
}

type VolOption = {
  id: string
  immatriculation: string
}

type Props = {
  billet: {
    id: string
    reference: string
    payeurPrenom: string
    payeurNom: string
  }
  passagers: Passager[]
  sessionVols: VolOption[]
  currentVolId: string
  locale: string
  isMultiBallon: boolean
}

export function BilletAssignCard({
  billet,
  passagers,
  sessionVols,
  currentVolId,
  locale,
  isMultiBallon,
}: Props) {
  const t = useTranslations('vols')
  const [expanded, setExpanded] = useState(false)

  const totalWeight = passagers.reduce((sum, p) => sum + p.poids, 0)

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold">{billet.reference}</p>
            <p className="text-sm text-muted-foreground">
              {billet.payeurPrenom} {billet.payeurNom}
            </p>
            <p className="text-sm text-muted-foreground">
              {passagers.length} {passagers.length === 1 ? 'passager' : 'passagers'} — ~
              {totalWeight} kg
            </p>
          </div>
          {passagers.length > 1 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              {expanded ? 'Masquer' : 'Detailler'}
            </button>
          )}
        </div>

        {/* Billet-level assignment (all passagers at once) */}
        {!expanded && (
          <div className="flex flex-wrap gap-2">
            {sessionVols.map((sv) => (
              <form
                key={sv.id}
                action={async () => {
                  await affecterBillet(sv.id, billet.id, locale)
                }}
              >
                <button
                  type="submit"
                  className={cn(
                    buttonVariants({
                      size: 'sm',
                      variant: sv.id === currentVolId ? 'default' : 'outline',
                    }),
                  )}
                >
                  {isMultiBallon ? sv.immatriculation : t('organisation.affecter')}
                </button>
              </form>
            ))}
          </div>
        )}

        {/* Passager-level assignment (individual) */}
        {expanded && (
          <div className="space-y-2 border-t pt-3">
            {passagers.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                <div>
                  <span className="font-medium">
                    {p.prenom} {p.nom}
                  </span>
                  <span className="text-muted-foreground ml-2">{p.poids} kg</span>
                </div>
                <div className="flex gap-1">
                  {sessionVols.map((sv) => (
                    <form
                      key={sv.id}
                      action={async () => {
                        await affecterPassager(sv.id, p.id, locale)
                      }}
                    >
                      <button
                        type="submit"
                        className={cn(
                          buttonVariants({
                            size: 'sm',
                            variant: sv.id === currentVolId ? 'default' : 'outline',
                          }),
                          'text-xs px-2 py-0.5 h-7',
                        )}
                      >
                        {isMultiBallon ? sv.immatriculation : t('organisation.affecter')}
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
