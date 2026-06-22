import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import logger from "@/lib/logger"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  const { errorResponse, session } = await validateSession(["TEACHER", "STUDENT", "ADMIN"])
  if (errorResponse || !session) return errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, submissionId } = await params

  try {
    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: { select: { id: true, teacherId: true } },
        student: { select: { userId: true } },
      },
    })

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 })
    }

    // Ensure the submission belongs to the given assignment
    if (submission.assignmentId !== id) {
      return NextResponse.json({ error: "Submission does not belong to this assignment" }, { status: 400 })
    }

    // Students can only download their own submissions
    if (session.user.role === "STUDENT") {
      if (submission.student.userId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    // Teachers can only download submissions for assignments they created
    if (session.user.role === "TEACHER") {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      })
      if (!teacher || submission.assignment.teacherId !== teacher.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    // Generate a fresh 5-minute signed URL
    const { data, error } = await supabaseAdmin.storage
      .from("assignment-submissions")
      .createSignedUrl(submission.fileUrl, 300)

    if (error || !data?.signedUrl) {
      logger.error("Failed to generate signed URL for submission:", error)
      return NextResponse.json({ error: "Could not generate download link" }, { status: 500 })
    }

    return NextResponse.redirect(data.signedUrl)
  } catch (error) {
    logger.error("Submission download error:", error)
    return NextResponse.json({ error: "Download failed" }, { status: 500 })
  }
}
