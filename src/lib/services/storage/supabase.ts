import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Variáveis de ambiente Supabase não configuradas (SUPABASE_URL, SUPABASE_SERVICE_KEY)')
}
const supabase = createClient(supabaseUrl, supabaseKey)

export async function uploadFile(bucket: string, path: string, file: Buffer, contentType: string): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType,
    upsert: true,
  })

  if (error) {
    throw new Error(`Falha no upload: ${error.message}`)
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path])

  if (error) {
    throw new Error(`Falha na exclusão: ${error.message}`)
  }
}
