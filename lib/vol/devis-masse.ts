export type DevisMasseInput = {
  ballon: {
    peseeAVide: number
    performanceChart: Record<string, number>
    configGaz: string
  }
  pilotePoids: number
  passagers: readonly { poids: number }[]
  temperatureCelsius: number
  qteGaz: number
  equipementSupp?: number
}

export type DevisMasseResult = {
  poidsAVide: number
  poidsGaz: number
  poidsPilote: number
  poidsPassagers: number
  poidsEquipement: number
  poidsTotal: number
  chargeUtileMax: number
  margeRestante: number
  estSurcharge: boolean
  temperatureUtilisee: number
}

function lookupChargeUtileMax(
  chart: Record<string, number>,
  temperatureCelsius: number,
): { chargeUtileMax: number; temperatureUtilisee: number } {
  const temps = Object.keys(chart)
    .map(Number)
    .sort((a, b) => a - b)

  if (temps.length === 0) {
    return { chargeUtileMax: 0, temperatureUtilisee: temperatureCelsius }
  }

  const minTemp = temps[0]!
  const maxTemp = temps[temps.length - 1]!

  if (temperatureCelsius <= minTemp) {
    return { chargeUtileMax: chart[String(minTemp)]!, temperatureUtilisee: minTemp }
  }

  if (temperatureCelsius >= maxTemp) {
    return { chargeUtileMax: chart[String(maxTemp)]!, temperatureUtilisee: maxTemp }
  }

  const ceilTemp = temps.find((t) => t >= temperatureCelsius) ?? maxTemp
  return { chargeUtileMax: chart[String(ceilTemp)]!, temperatureUtilisee: ceilTemp }
}

export function calculerDevisMasse(input: DevisMasseInput): DevisMasseResult {
  const poidsAVide = input.ballon.peseeAVide
  const poidsGaz = input.qteGaz
  const poidsPilote = input.pilotePoids
  const poidsPassagers = input.passagers.reduce((sum, p) => sum + p.poids, 0)
  const poidsEquipement = input.equipementSupp ?? 0
  const poidsTotal = poidsAVide + poidsGaz + poidsPilote + poidsPassagers + poidsEquipement

  const { chargeUtileMax, temperatureUtilisee } = lookupChargeUtileMax(
    input.ballon.performanceChart,
    input.temperatureCelsius,
  )

  const margeRestante = chargeUtileMax - poidsTotal

  return {
    poidsAVide,
    poidsGaz,
    poidsPilote,
    poidsPassagers,
    poidsEquipement,
    poidsTotal,
    chargeUtileMax,
    margeRestante,
    estSurcharge: margeRestante < 0,
    temperatureUtilisee,
  }
}
