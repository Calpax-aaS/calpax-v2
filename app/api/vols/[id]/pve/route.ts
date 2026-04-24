import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { requireRole } from '@/lib/auth/requireRole'
import { getContext } from '@/lib/context'
import { db } from '@/lib/db'
import { getSignedPveUrl } from '@/lib/storage/pve'
import { buildVolWhereForRole } from '@/lib/vol/role-filter'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return requireAuth(async () => {
    const { id } = await params
    // EQUIPIER has no access to PVE documents (sensitive passenger data).
    // PILOTE can only fetch PVEs for vols they flew.
    requireRole('ADMIN_CALPAX', 'GERANT', 'PILOTE')
    const ctx = getContext()

    const where = buildVolWhereForRole({ id }, ctx.role, ctx.userId)
    const vol = await db.vol.findFirst({ where, select: { pvePdfUrl: true } })
    if (!vol) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (!vol.pvePdfUrl) {
      return NextResponse.json({ error: 'PVE not archived yet' }, { status: 404 })
    }

    const signedUrl = await getSignedPveUrl(vol.pvePdfUrl)
    return NextResponse.redirect(signedUrl)
  })
}
