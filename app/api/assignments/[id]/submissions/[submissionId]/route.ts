import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string, submissionId: string }> }) {
  const { errorResponse, session } = await validateSession(["TEACHER"])
  if (errorResponse || !session) return errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  
  const { id, submissionId } = await params

  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } })
    if (!teacher) return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 })

    const assignment = await prisma.assignment.findUnique({ where: { id } })
    if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    if (assignment.teacherId !== teacher.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

    const submission = await prisma.assignmentSubmission.findUnique({ where: { id: submissionId } })
    if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 })
    if (submission.assignmentId !== id) return NextResponse.json({ error: "Invalid submission for this assignment" }, { status: 400 })

    const body = await request.json()
    const { status, teacherNote } = body

    if (!["PENDING", "COMPLETED"].includes(status)) {
      return NextResponse.json({ error: "Status must be PENDING or COMPLETED" }, { status: 400 })
    }

    const updatedSubmission = await prisma.$transaction(async (tx) => {
      const updated = await tx.assignmentSubmission.update({
        where: { id: submissionId },
        data: {
          status,
          teacherNote: teacherNote || null,
          reviewedAt: new Date()
        }
      })

      await tx.auditLog.create({
        data: {
          action: "SUBMISSION_REVIEWED",
          performedBy: session.user.id,
          targetId: submissionId,
          note: `Reviewed submission for assignment ${assignment.title} with status ${status}`,
        }
      })

      return updated
    })

    return NextResponse.json(updatedSubmission)
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update submission" }, { status: 500 })
  }
}
