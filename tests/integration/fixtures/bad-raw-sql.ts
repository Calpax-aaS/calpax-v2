// intentionally bad for eslint test: raw SQL used outside lib/db/raw/
import { db } from '@/lib/db'
export async function bad() {
  return db.$queryRaw`SELECT 1`
}
