import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"
import { deleteFromStorage, uploadToStorage, validateFile } from "@/lib/assignmentHelpers"

export const config = {
  api: {
    bodyParser: false,
  },
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { errorResponse, session } = await validateSession(["STUDENT"])
  if (errorResponse || !session) return errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const student = await prisma.student.findUnique({ where: { userId: session.user.id } })
    if (!student) return NextResponse.json({ error: "Student profile not found" }, { status: 404 })

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: { submissions: { where: { studentId: student.id } } }
    })

    if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    if (assignment.className !== student.class) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

    if (new Date() > new Date(assignment.dueDate)) {
      return NextResponse.json({ error: "Submission deadline has passed" }, { status: 400 })
    }

    if (assignment.submissions.length > 0) {
      return NextResponse.json({ error: "Already submitted. Use PATCH to update your submission." }, { status: 409 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file || file.size === 0) {
      return NextResponse.json({ error: "File is required" }, { status: 400 })
    }

    const allowedTypes = [
      "application/pdf", "application/msword", 
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg", "image/png", "text/plain", "application/zip",
      "video/mp4", "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ]

    const { valid, error } = validateFile(file.type, file.size, 50, allowedTypes)
    if (!valid) return NextResponse.json({ error }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const timestamp = Date.now()
    const path = `submissions/${id}/${student.id}/${timestamp}-${file.name}`
    
    let fileUrl = ""
    try {
      fileUrl = await uploadToStorage("assignment-submissions", path, buffer, file.type)
    } catch (e: any) {
      return NextResponse.json({ error: `Upload failed: ${e.message}` }, { status: 500 })
    }

    try {
      const newSubmission = await prisma.$transaction(async (tx) => {
        const submission = await tx.assignmentSubmission.create({
          data: {
            assignmentId: id,
            studentId: student.id,
            fileUrl,
            fileName: file.name,
            fileSize: file.size,
            status: "SUBMITTED"
          }
        })

        await tx.auditLog.create({
          data: {
            action: "ASSIGNMENT_SUBMITTED",
            performedBy: session.user.id,
            targetId: submission.id,
            note: `Student ${student.rollNo} submitted assignment ${assignment.title}`,
          }
        })

        return submission
      })

      return NextResponse.json({ success: true, submission: newSubmission })
    } catch (dbError) {
      // Rollback upload
      await deleteFromStorage("assignment-submissions", fileUrl)
      throw dbError
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to submit assignment" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { errorResponse, session } = await validateSession(["STUDENT"])
  if (errorResponse || !session) return errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const student = await prisma.student.findUnique({ where: { userId: session.user.id } })
    if (!student) return NextResponse.json({ error: "Student profile not found" }, { status: 404 })

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: { submissions: { where: { studentId: student.id } } }
    })

    if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    if (assignment.className !== student.class) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

    if (new Date() > new Date(assignment.dueDate)) {
      return NextResponse.json({ error: "Submission deadline has passed" }, { status: 400 })
    }

    if (assignment.submissions.length === 0) {
      return NextResponse.json({ error: "No existing submission found. Use POST instead." }, { status: 404 })
    }

    const existingSubmission = assignment.submissions[0]
    
    // Cannot resubmit if teacher already graded it as completed
    if (existingSubmission.status === "COMPLETED") {
      return NextResponse.json({ error: "Assignment has already been completed and graded" }, { status: 400 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file || file.size === 0) {
      return NextResponse.json({ error: "File is required" }, { status: 400 })
    }

    const allowedTypes = [
      "application/pdf", "application/msword", 
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg", "image/png", "text/plain", "application/zip",
      "video/mp4", "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ]

    const { valid, error } = validateFile(file.type, file.size, 50, allowedTypes)
    if (!valid) return NextResponse.json({ error }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const timestamp = Date.now()
    const path = `submissions/${id}/${student.id}/${timestamp}-${file.name}`
    
    let fileUrl = ""
    try {
      fileUrl = await uploadToStorage("assignment-submissions", path, buffer, file.type)
    } catch (e: any) {
      return NextResponse.json({ error: `Upload failed: ${e.message}` }, { status: 500 })
    }

    try {
      const updatedSubmission = await prisma.$transaction(async (tx) => {
        const sub = await tx.assignmentSubmission.update({
          where: { id: existingSubmission.id },
          data: {
            fileUrl,
            fileName: file.name,
            fileSize: file.size,
            status: "SUBMITTED",
            submittedAt: new Date(),
          }
        })

        await tx.auditLog.create({
          data: {
            action: "ASSIGNMENT_RESUBMITTED",
            performedBy: session.user.id,
            targetId: sub.id,
            note: `Student ${student.rollNo} resubmitted assignment ${assignment.title}`,
          }
        })

        return sub
      })

      // Clean up old file asynchronously
      deleteFromStorage("assignment-submissions", existingSubmission.fileUrl).catch(console.error)

      return NextResponse.json({ success: true, submission: updatedSubmission })
    } catch (dbError) {
      await deleteFromStorage("assignment-submissions", fileUrl)
      throw dbError
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to resubmit assignment" }, { status: 500 })
  }
}
