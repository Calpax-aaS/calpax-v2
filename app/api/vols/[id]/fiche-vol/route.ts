import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { generateFicheVolBuffer } from '@/lib/pdf/generate'
import { buildFicheVolData } from '@/lib/pdf/build-data'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return requireAuth(async () => {
    const { id } = await params

    const { data, vol } = await buildFicheVolData(id)
    const buffer = await generateFicheVolBuffer(data)

    const dateStr = vol.date.toISOString().slice(0, 10)
    const creneau = vol.creneau.toLowerCase()
    const filename = `${dateStr}-${creneau}-${vol.immatriculation}-PVE.pdf`

    // PVE PDF embeds passenger names + weights (PII). Disable any caching so
    // shared caches and the browser disk cache never persist a copy.
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store, no-cache, must-revalidate',
      },
    })
  })
}
