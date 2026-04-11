import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { FicheVolDocument, type FicheVolData } from './fiche-vol'

export type { FicheVolData }

export async function generateFicheVolBuffer(data: FicheVolData): Promise<Buffer> {
  const buffer = await renderToBuffer(<FicheVolDocument data={data} />)
  return Buffer.from(buffer)
}
