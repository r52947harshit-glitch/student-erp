import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import logger from "@/lib/logger"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse, session } = await validateSession(["TEACHER", "STUDENT", "ADMIN"])
  if (errorResponse || !session) return errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id },
      select: { fileUrl: true, fileName: true, className: true },
    })

    if (!assignment?.fileUrl) {
      return NextResponse.json({ error: "No file attached to this assignment" }, { status: 404 })
    }

    // Students can only download assignments for their own class
    if (session.user.role === "STUDENT") {
      const student = await prisma.student.findUnique({
        where: { userId: session.user.id },
        select: { class: true },
      })
      if (student?.class !== assignment.className) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    // Teachers can only download assignments for classes they teach
    if (session.user.role === "TEACHER") {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: session.user.id },
        include: { assignedClasses: true },
      })
      const isAssigned = teacher?.assignedClasses.some(
        (ac) => ac.className === assignment.className
      )
      if (!isAssigned) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    // Generate a fresh 5-minute signed URL
    const { data, error } = await supabaseAdmin.storage
      .from("assignment-files")
      .createSignedUrl(assignment.fileUrl, 300)

    if (error || !data?.signedUrl) {
      logger.error("Failed to generate signed URL for assignment:", error)
      return NextResponse.json({ error: "Could not generate download link" }, { status: 500 })
    }

    return NextResponse.redirect(data.signedUrl)
  } catch (error) {
    logger.error("Assignment download error:", error)
    return NextResponse.json({ error: "Download failed" }, { status: 500 })
  }
}
