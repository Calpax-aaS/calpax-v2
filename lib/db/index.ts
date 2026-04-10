import { basePrisma } from './base'
import { tenantExtension } from './tenant-extension'
import { auditExtension } from './audit-extension'

export const db = basePrisma.$extends(tenantExtension).$extends(auditExtension)
export const adminDb = basePrisma.$extends(auditExtension)
