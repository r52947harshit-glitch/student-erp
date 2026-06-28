import { supabaseAdmin } from "@/lib/supabaseAdmin"
import logger from "@/lib/logger"

const ALLOWED_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
]
const MAX_PHOTO_BYTES = 2 * 1024 * 1024 // 2MB

export interface UploadResult {
  success: boolean
  photoUrl?: string
  error?: string
}

export async function uploadPhoto(
  file: File,
  bucket: string,
  folder: string,
  entityId: string
): Promise<UploadResult> {
  // 1. Validate mime type server-side
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    return {
      success: false,
      error: "Only JPG, PNG, and WebP images are allowed.",
    }
  }

  // 2. Validate file size server-side
  if (file.size > MAX_PHOTO_BYTES) {
    return {
      success: false,
      error: "Image must be under 2MB.",
    }
  }

  // 3. Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // 4. Build safe file path
  const ext = file.type.split("/")[1].replace("jpeg", "jpg")
  const timestamp = Date.now()
  const filePath = `${folder}/${entityId}/${timestamp}.${ext}`

  // 5. Upload using supabaseAdmin (service role — never anon)
  const { error: uploadError } = await supabaseAdmin.storage
    .from(bucket)
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: true, // overwrite if same path
    })

  if (uploadError) {
    logger.error(`Supabase upload error [${bucket}]:`, uploadError)
    return {
      success: false,
      error: `Upload failed: ${uploadError.message}`,
    }
  }

  // 6. Get public URL
  // This works only if bucket is PUBLIC in Supabase
  const { data } = supabaseAdmin.storage
    .from(bucket)
    .getPublicUrl(filePath)

  return {
    success: true,
    photoUrl: data.publicUrl,
  }
}

export async function deleteOldPhoto(
  bucket: string,
  oldPhotoUrl: string | null
): Promise<void> {
  if (!oldPhotoUrl) return

  try {
    // Extract path from full public URL
    // URL format: https://xxx.supabase.co/storage/v1/object/public/BUCKET/PATH
    const urlParts = oldPhotoUrl.split(`/object/public/${bucket}/`)
    if (urlParts.length < 2) return

    const oldPath = urlParts[1]
    if (!oldPath) return

    await supabaseAdmin.storage.from(bucket).remove([oldPath])
  } catch (err) {
    // Log but don't throw — old file cleanup
    // should never block new upload
    logger.error("Old photo cleanup failed:", err)
  }
}
