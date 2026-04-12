import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { generateFicheVolBuffer } from '@/lib/pdf/generate'
import { parseQteGazFromConfig } from '@/lib/vol/parse-config-gaz'
import { getWeather } from '@/lib/weather/cache'
import { extractCreneauHours } from '@/lib/weather/extract'
import { summarizeWeather } from '@/lib/weather/classify'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return requireAuth(async () => {
    const { id } = await params

    const vol = await db.vol.findUniqueOrThrow({
      where: { id },
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
        passagers: { include: { billet: { select: { reference: true } } } },
      },
    })

    const pilotePoids = vol.pilote.poidsEncrypted
      ? parseInt(decrypt(vol.pilote.poidsEncrypted))
      : 80

    const passagers = vol.passagers.map((p) => ({
      prenom: p.prenom,
      nom: p.nom,
      age: p.age,
      poids: p.poidsEncrypted ? parseInt(decrypt(p.poidsEncrypted)) : 0,
      pmr: p.pmr,
      billetReference: p.billet.reference,
    }))

    let meteo = undefined
    const seuilVent = vol.exploitant.meteoSeuilVent ?? 15

    if (vol.exploitant.meteoLatitude && vol.exploitant.meteoLongitude) {
      try {
        const dateStr = vol.date.toISOString().slice(0, 10)
        const forecast = await getWeather({
          exploitantId: vol.exploitantId,
          latitude: vol.exploitant.meteoLatitude,
          longitude: vol.exploitant.meteoLongitude,
          date: dateStr,
        })
        const hours = extractCreneauHours(forecast, vol.creneau as 'MATIN' | 'SOIR')
        const summary = summarizeWeather(hours, seuilVent)
        meteo = { hours, summary, seuilVent }
      } catch {
        // Weather not available — PDF will show placeholder
      }
    }

    const buffer = await generateFicheVolBuffer({
      exploitant: vol.exploitant,
      vol: {
        date: vol.date,
        creneau: vol.creneau,
        lieuDecollage: vol.lieuDecollage,
        equipier: vol.equipier,
        vehicule: vol.vehicule,
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
      temperatureCelsius: 20,
      isPve: false,
      archivedAt: null,
      meteo,
    })

    const filename = `fiche-vol-${vol.ballon.immatriculation}-${vol.date.toISOString().slice(0, 10)}.pdf`

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  })
}
