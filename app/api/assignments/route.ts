import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"
import { CLASS_LIST, SUBJECT_LIST } from "@/lib/constants"
import { uploadToStorage, validateFile } from "@/lib/assignmentHelpers"
import { notifyAssignmentPosted } from "@/lib/notificationService"
import logger from "@/lib/logger"
import { z } from "zod"

export const config = {
  api: {
    bodyParser: false,
  },
}

const assignmentSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(5).max(1000),
  className: z.enum(CLASS_LIST as [string, ...string[]]),
  subject: z.enum(SUBJECT_LIST as [string, ...string[]]),
  dueDate: z.coerce.date().refine(date => date > new Date(), {
    message: "Due date must be in the future",
  }),
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "20")
  const skip = (page - 1) * limit
  const classNameFilter = searchParams.get("className")
  const subjectFilter = searchParams.get("subject")

  // Check teacher session first
  const teacherSession = await validateSession(["TEACHER"])
  if (!teacherSession.errorResponse && teacherSession.session) {
    const teacherId = teacherSession.session.user.id
    
    // Get actual teacher record ID
    const teacher = await prisma.teacher.findUnique({
      where: { userId: teacherId }
    })
    
    if (!teacher) return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 })

    const whereClause: any = { teacherId: teacher.id }
    if (classNameFilter) whereClause.className = classNameFilter
    if (subjectFilter) whereClause.subject = subjectFilter

    const [assignments, total] = await Promise.all([
      prisma.assignment.findMany({
        where: whereClause,
        include: {
          _count: {
            select: { submissions: true }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.assignment.count({ where: whereClause })
    ])

    return NextResponse.json({ assignments, total, page, totalPages: Math.ceil(total / limit) })
  }

  // Check student session
  const studentSession = await validateSession(["STUDENT"])
  if (!studentSession.errorResponse && studentSession.session) {
    const studentId = studentSession.session.user.id
    
    // Get actual student record
    const student = await prisma.student.findUnique({
      where: { userId: studentId }
    })

    if (!student) return NextResponse.json({ error: "Student profile not found" }, { status: 404 })

    const whereClause: any = { className: student.class }
    if (subjectFilter) whereClause.subject = subjectFilter

    const assignments = await prisma.assignment.findMany({
      where: whereClause,
      include: {
        teacher: {
          include: { user: { select: { name: true } } }
        },
        submissions: {
          where: { studentId: student.id }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    const formattedAssignments = assignments.map(a => {
      const { submissions, ...rest } = a
      return {
        ...rest,
        mySubmission: submissions.length > 0 ? submissions[0] : null
      }
    })

    return NextResponse.json({ assignments: formattedAssignments })
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

export async function POST(request: Request) {
  const { errorResponse, session } = await validateSession(["TEACHER"])
  if (errorResponse || !session) return errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      include: { assignedClasses: true }
    })

    if (!teacher) return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 })

    const formData = await request.formData()
    
    // Parsing manual fields
    const payload = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      className: formData.get("className") as string,
      subject: formData.get("subject") as string,
      dueDate: formData.get("dueDate") as string,
    }

    const parseResult = assignmentSchema.safeParse(payload)
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.issues[0].message }, { status: 400 })
    }

    const { title, description, className, subject, dueDate } = parseResult.data

    // Security: verify className + subject is assigned to this teacher
    const isAssigned = teacher.assignedClasses.some(ac => ac.className === className && ac.subjects.includes(subject))
    if (!isAssigned) {
      return NextResponse.json({ error: "You are not assigned to this class and subject combination" }, { status: 403 })
    }

    const file = formData.get("file") as File | null
    let fileUrl = null
    let fileName = null

    if (file && file.size > 0) {
      const { valid, error } = validateFile(file.type, file.size, 10, [
        "application/pdf", 
        "application/msword", 
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg", 
        "image/png", 
        "text/plain"
      ])

      if (!valid) return NextResponse.json({ error }, { status: 400 })

      const buffer = Buffer.from(await file.arrayBuffer())
      const timestamp = Date.now()
      const ext = file.name.split('.').pop()
      const path = `assignments/${teacher.id}/${timestamp}-${file.name}`
      
      fileUrl = await uploadToStorage("assignment-files", path, buffer, file.type)
      fileName = file.name
    }

    const newAssignment = await prisma.$transaction(async (tx) => {
      const assignment = await tx.assignment.create({
        data: {
          teacherId: teacher.id,
          className,
          subject,
          title,
          description,
          dueDate,
          fileUrl,
          fileName,
        }
      })

      await tx.auditLog.create({
        data: {
          action: "ASSIGNMENT_CREATED",
          performedBy: session.user.id,
          targetId: assignment.id,
          note: `Created assignment for class ${className} subject ${subject}`,
        }
      })

      return assignment
    })

    // Get all student userIds in that class to notify them
    const students = await prisma.student.findMany({
      where: { class: className, user: { isActive: true } },
      select: { user: { select: { id: true } } }
    })
    const studentUserIds = students.map((s) => s.user.id)
    
    // Fire and forget — do not await
    notifyAssignmentPosted(newAssignment, studentUserIds)
      .catch((e) => logger.error("Notification failed:", e))

    return NextResponse.json(newAssignment)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create assignment" }, { status: 500 })
  }
}
