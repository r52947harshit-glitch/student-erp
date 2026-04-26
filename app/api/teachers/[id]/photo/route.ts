// REQUIRED SUPABASE SETUP:
// Go to Supabase Dashboard → Storage → teacher-photos bucket
// → Make bucket PUBLIC so photos display correctly
// → If bucket does not exist, create it:
//   Name: teacher-photos
//   Public: YES (so photo URLs work without signed URLs)
//   Max file size: 2MB
//   Allowed MIME types: image/jpeg, image/png, image/webp

import { NextResponse } from "next/server"
import { validateSession } from "@/lib/apiAuth"
import { prisma } from "@/lib/prisma"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2MB

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { errorResponse, session } = await validateSession(["ADMIN"])
  if (errorResponse || !session) return errorResponse

  try {
    const { id } = await params
    
    // Get teacher record
    const teacher = await prisma.teacher.findUnique({
      where: { id },
    })
    
    if (!teacher) {
      return NextResponse.json(
        { error: "Teacher not found" },
        { status: 404 }
      )
    }

    // Parse FormData
    const formData = await request.formData()
    const file = formData.get("photo") as File | null

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // Validate mime type server-side
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPG, PNG and WebP images are allowed" },
        { status: 400 }
      )
    }

    // Validate file size server-side
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Image must be under 2MB" },
        { status: 400 }
      )
    }

    // Convert File to Buffer for Supabase upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Build unique file path
    const ext = file.type.split("/")[1]
    const filePath = `teachers/${teacher.id}/${Date.now()}.${ext}`

    // Delete old photo from storage if it exists
    if (teacher.photoUrl) {
      try {
        const oldPath = teacher.photoUrl.split("teacher-photos/")[1]
        if (oldPath) {
          await supabaseAdmin.storage
            .from("teacher-photos")
            .remove([oldPath])
        }
      } catch {
        // Old file deletion failure should not block new upload
      }
    }

    // Upload new photo using supabaseAdmin (service role key)
    const { error: uploadError } = await supabaseAdmin.storage
      .from("teacher-photos")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Get public URL for the uploaded photo
    const { data: urlData } = supabaseAdmin.storage
      .from("teacher-photos")
      .getPublicUrl(filePath)

    const photoUrl = urlData.publicUrl

    // Update teacher record in DB and Audit Log
    await prisma.$transaction(async (tx) => {
      await tx.teacher.update({
        where: { id: teacher.id },
        data: { photoUrl },
      })

      await tx.auditLog.create({
        data: {
          action: "TEACHER_PHOTO_UPDATED",
          performedBy: session.user.id,
          targetId: teacher.id,
          note: `Admin uploaded a new profile photo for teacher ${teacher.employeeId}`,
        },
      })
    })

    return NextResponse.json({ photoUrl })
  } catch (error) {
    return NextResponse.json(
      { error: "Server error during photo upload" },
      { status: 500 }
    )
  }
}
