import { supabaseAdmin } from "./supabaseAdmin"

// Generate a signed URL for private Supabase file access
// Expires in 1 hour (3600 seconds)
export async function getSignedUrl(
  bucket: string,
  path: string
): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, 3600)
  if (error || !data) return null
  return data.signedUrl
}

// Upload file to Supabase storage, return the storage path
export async function uploadToStorage(
  bucket: string,
  path: string,
  file: Buffer,
  mimeType: string
): Promise<string> {
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, file, {
      contentType: mimeType,
      upsert: false,
    })
  if (error) throw new Error(`Upload failed: ${error.message}`)
  return path
}

// Delete file from Supabase storage
export async function deleteFromStorage(
  bucket: string,
  path: string
): Promise<void> {
  await supabaseAdmin.storage.from(bucket).remove([path])
}

// Validate uploaded file server-side
export function validateFile(
  mimeType: string,
  sizeBytes: number,
  maxMB: number,
  allowedTypes: string[]
): { valid: boolean; error?: string } {
  if (!allowedTypes.includes(mimeType)) {
    return { valid: false, error: `File type not allowed: ${mimeType}` }
  }
  if (sizeBytes > maxMB * 1024 * 1024) {
    return { valid: false, error: `File too large. Max size is ${maxMB}MB` }
  }
  return { valid: true }
}
