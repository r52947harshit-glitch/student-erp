import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"
import { getSignedUrl } from "@/lib/assignmentHelpers"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { errorResponse, session } = await validateSession(["TEACHER"])
  if (errorResponse || !session) return errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } })
    if (!teacher) return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 })

    const assignment = await prisma.assignment.findUnique({ where: { id } })
    if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    if (assignment.teacherId !== teacher.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

    const submissions = await prisma.assignmentSubmission.findMany({
      where: { assignmentId: id },
      include: {
        student: {
          include: {
            user: { select: { name: true } }
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    })

    const submissionsWithSignedUrls = await Promise.all(submissions.map(async (sub) => {
      const fileUrl = await getSignedUrl("assignment-submissions", sub.fileUrl)
      return { ...sub, fileUrl }
    }))

    return NextResponse.json({ submissions: submissionsWithSignedUrls })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 })
  }
}
