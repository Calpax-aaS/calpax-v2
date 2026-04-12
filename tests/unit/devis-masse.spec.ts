import { describe, it, expect } from 'vitest'
import { calculerDevisMasse, type DevisMasseInput } from '@/lib/vol/devis-masse'

const FHFCC_CHART: Record<string, number> = {
  '10': 482,
  '11': 470,
  '12': 458,
  '13': 446,
  '14': 434,
  '15': 422,
  '16': 411,
  '17': 399,
  '18': 388,
  '19': 376,
  '20': 365,
  '21': 354,
  '22': 342,
  '23': 331,
  '24': 320,
  '25': 309,
  '26': 298,
  '27': 288,
  '28': 277,
  '29': 266,
  '30': 256,
  '31': 245,
  '32': 235,
  '33': 224,
  '34': 214,
}

const FHACK_CHART: Record<string, number> = {
  '10': 1093,
  '11': 1067,
  '12': 1041,
  '13': 1016,
  '14': 990,
  '15': 965,
  '16': 940,
  '17': 915,
  '18': 891,
  '19': 866,
  '20': 842,
  '21': 818,
  '22': 794,
  '23': 770,
  '24': 746,
  '25': 723,
  '26': 699,
  '27': 676,
  '28': 653,
  '29': 630,
  '30': 607,
  '31': 585,
  '32': 562,
  '33': 540,
  '34': 518,
}

function makeInput(overrides: Partial<DevisMasseInput> = {}): DevisMasseInput {
  return {
    ballon: {
      peseeAVide: 376,
      performanceChart: FHFCC_CHART,
      configGaz: '4xCB2990 : 4x23 kg',
    },
    pilotePoids: 92,
    passagers: [{ poids: 75 }, { poids: 80 }],
    temperatureCelsius: 20,
    qteGaz: 92,
    ...overrides,
  }
}

describe('calculerDevisMasse', () => {
  it('computes correct totals for F-HFCC at 20C', () => {
    const result = calculerDevisMasse(makeInput())
    expect(result.poidsAVide).toBe(376)
    expect(result.poidsGaz).toBe(92)
    expect(result.poidsPilote).toBe(92)
    expect(result.poidsPassagers).toBe(155)
    expect(result.chargeEmbarquee).toBe(92 + 92 + 155) // gaz + pilote + passagers = 339
    expect(result.chargeUtileMax).toBe(365)
    expect(result.margeRestante).toBe(365 - 339) // 26 kg margin
    expect(result.estSurcharge).toBe(false)
    expect(result.temperatureUtilisee).toBe(20)
  })

  it('uses ceiling temperature for interpolation (22.5 -> 23)', () => {
    const result = calculerDevisMasse(makeInput({ temperatureCelsius: 22.5 }))
    expect(result.temperatureUtilisee).toBe(23)
    expect(result.chargeUtileMax).toBe(331)
  })

  it('uses exact temperature when integer', () => {
    const result = calculerDevisMasse(makeInput({ temperatureCelsius: 10 }))
    expect(result.temperatureUtilisee).toBe(10)
    expect(result.chargeUtileMax).toBe(482)
  })

  it('clamps to max temperature (34) when above range', () => {
    const result = calculerDevisMasse(makeInput({ temperatureCelsius: 40 }))
    expect(result.temperatureUtilisee).toBe(34)
    expect(result.chargeUtileMax).toBe(214)
  })

  it('clamps to min temperature (10) when below range', () => {
    const result = calculerDevisMasse(makeInput({ temperatureCelsius: 5 }))
    expect(result.temperatureUtilisee).toBe(10)
    expect(result.chargeUtileMax).toBe(482)
  })

  it('computes F-HACK at 20C with 4 passengers — no surcharge', () => {
    const result = calculerDevisMasse({
      ballon: {
        peseeAVide: 746,
        performanceChart: FHACK_CHART,
        configGaz: '4xCB2903 : 4x36 kg',
      },
      pilotePoids: 92,
      passagers: [{ poids: 75 }, { poids: 80 }, { poids: 70 }, { poids: 65 }],
      temperatureCelsius: 20,
      qteGaz: 144,
    })
    expect(result.poidsAVide).toBe(746)
    expect(result.poidsPassagers).toBe(290)
    expect(result.chargeUtileMax).toBe(842)
    expect(result.chargeEmbarquee).toBe(144 + 92 + 290) // 526 kg
    // chargeUtileMax (842) > chargeEmbarquee (526) — not overloaded
    expect(result.estSurcharge).toBe(false)
  })

  it('includes equipementSupp in total', () => {
    const result = calculerDevisMasse(makeInput({ equipementSupp: 20 }))
    expect(result.poidsEquipement).toBe(20)
    expect(result.chargeEmbarquee).toBe(92 + 92 + 155 + 20)
  })

  it('handles zero passengers', () => {
    const result = calculerDevisMasse(makeInput({ passagers: [] }))
    expect(result.poidsPassagers).toBe(0)
    expect(result.chargeEmbarquee).toBe(92 + 92)
  })

  it('computes F-HFCC at 34C — most restrictive', () => {
    const result = calculerDevisMasse(makeInput({ temperatureCelsius: 34 }))
    expect(result.chargeUtileMax).toBe(214)
  })
})
