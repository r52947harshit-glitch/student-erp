import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"
import { deleteFromStorage, getSignedUrl, uploadToStorage, validateFile } from "@/lib/assignmentHelpers"

export const config = {
  api: {
    bodyParser: false,
  },
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  // Try teacher session
  const teacherSession = await validateSession(["TEACHER"])
  if (!teacherSession.errorResponse && teacherSession.session) {
    const teacher = await prisma.teacher.findUnique({ where: { userId: teacherSession.session.user.id } })
    if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 })

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        submissions: {
          include: { student: { include: { user: { select: { name: true } } } } }
        }
      }
    })

    if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    if (assignment.teacherId !== teacher.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

    // Generate signed URLs for all submissions
    const submissionsWithSignedUrls = await Promise.all(assignment.submissions.map(async (sub) => {
      const signedUrl = await getSignedUrl("assignment-submissions", sub.fileUrl)
      return { ...sub, signedFileUrl: signedUrl }
    }))

    let assignmentSignedUrl = null
    if (assignment.fileUrl) {
      assignmentSignedUrl = await getSignedUrl("assignment-files", assignment.fileUrl)
    }

    return NextResponse.json({ ...assignment, signedFileUrl: assignmentSignedUrl, submissions: submissionsWithSignedUrls })
  }

  // Try student session
  const studentSession = await validateSession(["STUDENT"])
  if (!studentSession.errorResponse && studentSession.session) {
    const student = await prisma.student.findUnique({ where: { userId: studentSession.session.user.id } })
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 })

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        submissions: {
          where: { studentId: student.id }
        }
      }
    })

    if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    if (assignment.className !== student.class) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

    let assignmentSignedUrl = null
    if (assignment.fileUrl) {
      assignmentSignedUrl = await getSignedUrl("assignment-files", assignment.fileUrl)
    }

    const { submissions, ...rest } = assignment
    const mySubmission = submissions.length > 0 ? submissions[0] : null
    
    let submissionSignedUrl = null
    if (mySubmission) {
      submissionSignedUrl = await getSignedUrl("assignment-submissions", mySubmission.fileUrl)
    }

    return NextResponse.json({
      ...rest,
      signedFileUrl: assignmentSignedUrl,
      mySubmission: mySubmission ? { ...mySubmission, signedFileUrl: submissionSignedUrl } : null
    })
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { errorResponse, session } = await validateSession(["TEACHER"])
  if (errorResponse || !session) return errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } })
    if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 })

    const assignment = await prisma.assignment.findUnique({ where: { id } })
    if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    if (assignment.teacherId !== teacher.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

    const formData = await request.formData()
    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const dueDateStr = formData.get("dueDate") as string
    
    const updates: any = {}
    if (title) updates.title = title
    if (description) updates.description = description
    if (dueDateStr) {
      const newDate = new Date(dueDateStr)
      if (newDate > new Date()) updates.dueDate = newDate
      else return NextResponse.json({ error: "Due date must be in future" }, { status: 400 })
    }

    const file = formData.get("file") as File | null
    if (file && file.size > 0) {
      const { valid, error } = validateFile(file.type, file.size, 10, [
        "application/pdf", "application/msword", 
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg", "image/png", "text/plain"
      ])
      if (!valid) return NextResponse.json({ error }, { status: 400 })

      if (assignment.fileUrl) {
        await deleteFromStorage("assignment-files", assignment.fileUrl)
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const timestamp = Date.now()
      const path = `assignments/${teacher.id}/${timestamp}-${file.name}`
      
      updates.fileUrl = await uploadToStorage("assignment-files", path, buffer, file.type)
      updates.fileName = file.name
    }

    const updatedAssignment = await prisma.$transaction(async (tx) => {
      const updated = await tx.assignment.update({
        where: { id },
        data: updates
      })

      await tx.auditLog.create({
        data: {
          action: "ASSIGNMENT_UPDATED",
          performedBy: session.user.id,
          targetId: id,
          note: `Updated assignment ${title || assignment.title}`,
        }
      })

      return updated
    })

    return NextResponse.json(updatedAssignment)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update assignment" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { errorResponse, session } = await validateSession(["TEACHER"])
  if (errorResponse || !session) return errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } })
    if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 })

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: { _count: { select: { submissions: true } } }
    })
    
    if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    if (assignment.teacherId !== teacher.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

    if (assignment._count.submissions > 0) {
      return NextResponse.json({ error: "Cannot delete assignment that has student submissions. Archive it instead." }, { status: 400 })
    }

    if (assignment.fileUrl) {
      try {
        await deleteFromStorage("assignment-files", assignment.fileUrl)
      } catch (e) {
        console.error("Failed to delete file from storage during assignment deletion", e)
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.assignment.delete({ where: { id } })
      
      await tx.auditLog.create({
        data: {
          action: "ASSIGNMENT_DELETED",
          performedBy: session.user.id,
          targetId: id,
          note: `Deleted assignment ${assignment.title}`,
        }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete assignment" }, { status: 500 })
  }
}
