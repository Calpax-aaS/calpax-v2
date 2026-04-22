import { db } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { getWeather } from '@/lib/weather/cache'
import { extractCreneauHours } from '@/lib/weather/extract'
import { summarizeWeather } from '@/lib/weather/classify'
import type { FicheVolData } from './fiche-vol'

/**
 * Fetch all data needed to generate a PVE PDF for a given vol.
 * Single source of truth used by both dynamic generation (route) and archival (action).
 */
export async function buildFicheVolData(
  volId: string,
  overrides?: { isPve?: boolean; archivedAt?: Date | null },
): Promise<{ data: FicheVolData; vol: { date: Date; creneau: string; immatriculation: string } }> {
  const vol = await db.vol.findUniqueOrThrow({
    where: { id: volId },
    include: {
      exploitant: {
        select: {
          name: true,
          frDecNumber: true,
          logoUrl: true,
          meteoLatitude: true,
          meteoLongitude: true,
          meteoSeuilVent: true,
        },
      },
      ballon: true,
      pilote: true,
      equipierEntity: { select: { prenom: true, nom: true } },
      vehiculeEntity: { select: { nom: true } },
      siteDecollageEntity: { select: { nom: true } },
      passagers: { include: { billet: { select: { id: true, reference: true } } } },
    },
  })

  const pilotePoids = vol.pilote.poidsEncrypted ? parseInt(decrypt(vol.pilote.poidsEncrypted)) : 80

  const passagers = vol.passagers.map((p) => ({
    prenom: p.prenom,
    nom: p.nom,
    age: p.age,
    poids: p.poidsEncrypted ? parseInt(decrypt(p.poidsEncrypted)) : 0,
    pmr: p.pmr,
    billetReference: p.billet.reference,
  }))

  const seuilVent = vol.exploitant.meteoSeuilVent ?? 15
  let meteo: FicheVolData['meteo'] = undefined

  if (vol.exploitant.meteoLatitude && vol.exploitant.meteoLongitude) {
    try {
      const dateStr = vol.date.toISOString().slice(0, 10)
      const forecast = await getWeather({
        exploitantId: vol.exploitantId,
        latitude: vol.exploitant.meteoLatitude,
        longitude: vol.exploitant.meteoLongitude,
        date: dateStr,
      })
      const hours = extractCreneauHours(forecast, vol.creneau)
      const summary = summarizeWeather(hours, seuilVent)
      meteo = { hours, summary, seuilVent }
    } catch {
      // Weather not available
    }
  }

  const equipierDisplay = vol.equipierEntity
    ? `${vol.equipierEntity.prenom} ${vol.equipierEntity.nom}`
    : (vol.equipierAutre ?? null)
  const vehiculeDisplay = vol.vehiculeEntity?.nom ?? vol.vehiculeAutre ?? null
  const lieuDecollageDisplay = vol.siteDecollageEntity?.nom ?? vol.lieuDecollageAutre ?? null

  const data: FicheVolData = {
    exploitant: vol.exploitant,
    vol: {
      date: vol.date,
      creneau: vol.creneau,
      lieuDecollage: lieuDecollageDisplay,
      equipier: equipierDisplay,
      vehicule: vehiculeDisplay,
      configGaz: vol.configGaz ?? vol.ballon.configGaz,
      qteGaz: vol.qteGaz,
      decoLieu: vol.decoLieu,
      decoHeure: vol.decoHeure,
      atterLieu: vol.atterLieu,
      atterHeure: vol.atterHeure,
      gasConso: vol.gasConso,
      anomalies: vol.anomalies,
    },
    ballon: {
      nom: vol.ballon.nom,
      immatriculation: vol.ballon.immatriculation,
      volumeM3: vol.ballon.volumeM3,
      peseeAVide: vol.ballon.peseeAVide,
      performanceChart: vol.ballon.performanceChart as Record<string, number>,
      configGaz: vol.ballon.configGaz,
    },
    pilote: {
      prenom: vol.pilote.prenom,
      nom: vol.pilote.nom,
      licenceBfcl: vol.pilote.licenceBfcl,
      poids: pilotePoids,
    },
    passagers,
    temperatureCelsius: meteo?.summary.avgTemperature ?? 20,
    isPve: overrides?.isPve ?? false,
    archivedAt: overrides?.archivedAt ?? null,
    meteo,
  }

  return {
    data,
    vol: {
      date: vol.date,
      creneau: vol.creneau,
      immatriculation: vol.ballon.immatriculation,
    },
  }
}
