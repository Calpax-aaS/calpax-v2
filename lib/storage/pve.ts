import { createClient } from '@supabase/supabase-js'

function getStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Supabase config missing')
  return createClient(url, serviceKey)
}

const BUCKET = 'pve'

export async function uploadPve(
  exploitantId: string,
  volId: string,
  pdfBuffer: Buffer,
): Promise<string> {
  const supabase = getStorageClient()
  const path = `${exploitantId}/${volId}.pdf`

  const { error } = await supabase.storage.from(BUCKET).upload(path, pdfBuffer, {
    contentType: 'application/pdf',
    upsert: true,
  })

  if (error) throw new Error(`PVE upload failed: ${error.message}`)
  return path
}

export async function getSignedPveUrl(path: string): Promise<string> {
  const supabase = getStorageClient()

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed URL: ${error?.message ?? 'unknown'}`)
  }

  return data.signedUrl
}
