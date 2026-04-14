import { Pool } from 'pg'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

declare global {
  var __prismaBase: PrismaClient | undefined
}

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }
  const isRemote =
    !connectionString.includes('127.0.0.1') && !connectionString.includes('localhost')
  const caCert = process.env.SUPABASE_CA_CERT?.replace(/\\n/g, '\n')
  if (isRemote) {
    console.log(
      `[db] SSL mode: ${caCert ? 'CA cert verified (rejectUnauthorized: true)' : 'unverified (rejectUnauthorized: false)'}`,
    )
    if (!caCert && process.env.NODE_ENV === 'production') {
      console.warn(
        '[db] WARNING: Remote DB connection without CA cert verification. Set SUPABASE_CA_CERT for secure connections.',
      )
    }
  }
  const pool = new Pool({
    connectionString,
    ssl: isRemote
      ? {
          rejectUnauthorized: !!caCert,
          ...(caCert ? { ca: caCert } : {}),
        }
      : false,
    max: isRemote ? 2 : 10,
  })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

export const basePrisma = global.__prismaBase ?? createClient()

if (process.env.NODE_ENV !== 'production') {
  global.__prismaBase = basePrisma
}
