// intentionally bad for eslint test: adminDb imported outside allowed paths
import { adminDb } from '@/lib/db'
export function bad() {
  return adminDb
}
