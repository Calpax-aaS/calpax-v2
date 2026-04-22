import type { UserRole } from '@/lib/context'

/**
 * Passenger weight is RGPD-sensitive (CLAUDE.md: "accès restreint pilote +
 * exploitant"). Only ADMIN_CALPAX and GERANT can always see it; a PILOTE
 * can see it on vols where they are the assigned pilot (via Pilote.userId
 * matching the session user); EQUIPIER never sees it.
 */
export function canSeePassengerWeight(args: {
  role: UserRole
  /**
   * When gating inside a single vol, pass the vol's pilote `userId` so a
   * PILOTE viewing their own vol is allowed. Omit when the context has no
   * single owning pilote (e.g. billet list / detail).
   */
  piloteUserId?: string | null
  currentUserId?: string
}): boolean {
  const { role, piloteUserId, currentUserId } = args
  if (role === 'ADMIN_CALPAX' || role === 'GERANT') return true
  if (role === 'PILOTE' && piloteUserId && piloteUserId === currentUserId) return true
  return false
}
