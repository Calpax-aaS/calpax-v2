import { PrismaClient } from '@prisma/client'

declare global {
   
  var __prismaBase: PrismaClient | undefined
}

export const basePrisma =
  global.__prismaBase ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  global.__prismaBase = basePrisma
}
