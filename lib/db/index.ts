import { basePrisma } from './base'
import { tenantExtension } from './tenant-extension'

export const db = basePrisma.$extends(tenantExtension)
export const adminDb = basePrisma
