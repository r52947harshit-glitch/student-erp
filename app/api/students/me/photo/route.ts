import { NextResponse } from "next/server"
import { validateSession } from "@/lib/apiAuth"
import { prisma } from "@/lib/prisma"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2MB

export async function POST(request: Request) {
  const { errorResponse, session } = await validateSession(["STUDENT"])
  if (errorResponse || !session) return errorResponse

  try {
    // Get student record from session
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
    })
    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
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
    const filePath = `students/${student.id}/${Date.now()}.${ext}`

    // Delete old photo from storage if it exists
    if (student.photoUrl) {
      try {
        const oldPath = student.photoUrl.split("student-photos/")[1]
        if (oldPath) {
          await supabaseAdmin.storage
            .from("student-photos")
            .remove([oldPath])
        }
      } catch {
        // Old file deletion failure should not block new upload
      }
    }

    // Upload new photo using supabaseAdmin (service role key)
    const { error: uploadError } = await supabaseAdmin.storage
      .from("student-photos")
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
      .from("student-photos")
      .getPublicUrl(filePath)

    const photoUrl = urlData.publicUrl

    // Update student record in DB
    await prisma.$transaction(async (tx) => {
      await tx.student.update({
        where: { id: student.id },
        data: { photoUrl },
      })

      await tx.auditLog.create({
        data: {
          action: "STUDENT_PHOTO_UPDATED",
          performedBy: session.user.id,
          targetId: student.id,
          note: `Student ${student.rollNo} updated their profile photo`,
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
