import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { db } from '@/lib/db'
import { getSignedPveUrl } from '@/lib/storage/pve'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return requireAuth(async () => {
    const { id } = await params
    const vol = await db.vol.findUniqueOrThrow({ where: { id } })

    if (!vol.pvePdfUrl) {
      return NextResponse.json({ error: 'PVE not archived yet' }, { status: 404 })
    }

    const signedUrl = await getSignedPveUrl(vol.pvePdfUrl)
    return NextResponse.redirect(signedUrl)
  })
}
