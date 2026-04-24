import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { requireRole } from '@/lib/auth/requireRole'
import { getContext } from '@/lib/context'
import { db } from '@/lib/db'
import { generateFicheVolBuffer } from '@/lib/pdf/generate'
import { buildFicheVolData } from '@/lib/pdf/build-data'
import { buildVolWhereForRole } from '@/lib/vol/role-filter'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return requireAuth(async () => {
    const { id } = await params
    // Fiche-vol embeds decrypted passenger weights (RGPD). EQUIPIER has no
    // access; PILOTE is restricted to vols they flew via buildVolWhereForRole.
    requireRole('ADMIN_CALPAX', 'GERANT', 'PILOTE')
    const ctx = getContext()

    const where = buildVolWhereForRole({ id }, ctx.role, ctx.userId)
    const owned = await db.vol.findFirst({ where, select: { id: true } })
    if (!owned) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data, vol } = await buildFicheVolData(id)
    const buffer = await generateFicheVolBuffer(data)

    const dateStr = vol.date.toISOString().slice(0, 10)
    const creneau = vol.creneau.toLowerCase()
    const filename = `${dateStr}-${creneau}-${vol.immatriculation}-PVE.pdf`

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        // Fiche-vol bodies contain passenger PII. Never cache on CDN or browser.
        'Cache-Control': 'private, no-store',
      },
    })
  })
}
