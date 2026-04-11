import { getTranslations } from 'next-intl/server'
import { type DevisMasseResult } from '@/lib/vol/devis-masse'
import { Badge } from '@/components/ui/badge'

type Props = {
  result: DevisMasseResult
}

export async function DevisMasseLive({ result }: Props) {
  const t = await getTranslations('vols.devis')

  const rows: { label: string; value: number }[] = [
    { label: t('poidsAVide'), value: result.poidsAVide },
    { label: t('poidsGaz'), value: result.poidsGaz },
    { label: t('poidsPilote'), value: result.poidsPilote },
    { label: t('poidsPassagers'), value: result.poidsPassagers },
    { label: t('poidsEquipement'), value: result.poidsEquipement },
  ]

  return (
    <div className="space-y-3">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b last:border-b-0">
              <td className="py-1.5 text-muted-foreground">{row.label}</td>
              <td className="py-1.5 text-right font-medium tabular-nums">{row.value} kg</td>
            </tr>
          ))}
          <tr className="border-t-2 font-semibold">
            <td className="pt-2 pb-1">{t('poidsTotal')}</td>
            <td className="pt-2 pb-1 text-right tabular-nums">{result.poidsTotal} kg</td>
          </tr>
          <tr>
            <td className="py-1 text-muted-foreground">
              {t('chargeUtileMax')} ({t('temperature').replace('(C)', '')}
              {result.temperatureUtilisee}°C)
            </td>
            <td className="py-1 text-right tabular-nums">{result.chargeUtileMax} kg</td>
          </tr>
          <tr>
            <td className="py-1 text-muted-foreground">{t('margeRestante')}</td>
            <td
              className={`py-1 text-right font-semibold tabular-nums ${
                result.margeRestante < 0 ? 'text-destructive' : 'text-green-600'
              }`}
            >
              {result.margeRestante} kg
            </td>
          </tr>
        </tbody>
      </table>

      <div className="flex justify-center pt-2">
        {result.estSurcharge ? (
          <Badge variant="destructive" className="text-base px-4 py-1">
            {t('surcharge')}
          </Badge>
        ) : (
          <Badge className="bg-green-600 hover:bg-green-700 text-base px-4 py-1">
            {t('conforme')}
          </Badge>
        )}
      </div>
    </div>
  )
}
