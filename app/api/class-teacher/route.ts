import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"
import { CLASS_LIST } from "@/lib/constants"
import logger from "@/lib/logger"

export async function GET() {
  const { errorResponse, session } = await validateSession(["ADMIN"])
  if (errorResponse || !session) return errorResponse

  try {
    const classTeachers = await prisma.classTeacher.findMany({
      include: {
        teacher: {
          select: { id: true, employeeId: true, photoUrl: true, user: { select: { name: true } } }
        }
      }
    })

    const classTeacherMap = new Map(classTeachers.map(ct => [ct.className, ct]))

    const classes = CLASS_LIST.map(className => {
      const ct = classTeacherMap.get(className)
      return {
        className,
        classTeacher: ct ? {
          id: ct.teacher.id,
          name: ct.teacher.user.name,
          employeeId: ct.teacher.employeeId,
          photoUrl: ct.teacher.photoUrl
        } : null
      }
    })

    return NextResponse.json({ classes })
  } catch (error) {
    logger.error("Failed to fetch class teachers:", error)
    return NextResponse.json({ error: "Failed to fetch class teachers" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { errorResponse, session } = await validateSession(["ADMIN"])
  if (errorResponse || !session) return errorResponse

  try {
    const { className, teacherId } = await request.json()

    if (!CLASS_LIST.includes(className)) {
      return NextResponse.json({ error: "Invalid class name" }, { status: 400 })
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: { assignedClasses: true, user: { select: { isActive: true } } }
    })

    if (!teacher || !teacher.user.isActive) {
      return NextResponse.json({ error: "Teacher not found or inactive" }, { status: 400 })
    }

    const isAssignedToClass = teacher.assignedClasses.some(ac => ac.className === className)
    if (!isAssignedToClass) {
      return NextResponse.json({ error: "Teacher is not assigned to this class" }, { status: 400 })
    }

    const classTeacher = await prisma.$transaction(async (tx) => {
      // First, remove this teacher from any other class they might be class teacher of
      // because teacherId is @unique in ClassTeacher
      const existingAssignment = await tx.classTeacher.findUnique({
        where: { teacherId }
      })
      
      if (existingAssignment && existingAssignment.className !== className) {
        await tx.classTeacher.delete({ where: { teacherId } })
      }

      const ct = await tx.classTeacher.upsert({
        where: { className },
        create: { className, teacherId, assignedBy: session.user.id },
        update: { teacherId, assignedBy: session.user.id, assignedAt: new Date() }
      })

      await tx.auditLog.create({
        data: {
          action: "CLASS_TEACHER_ASSIGNED",
          performedBy: session.user.id,
          targetId: ct.id,
          note: `Assigned teacher ${teacher.employeeId} as class teacher for class ${className}`
        }
      })

      return ct
    })

    return NextResponse.json({ success: true, classTeacher })
  } catch (error) {
    logger.error("Failed to assign class teacher:", error)
    return NextResponse.json({ error: "Failed to assign class teacher" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { errorResponse, session } = await validateSession(["ADMIN"])
  if (errorResponse || !session) return errorResponse

  const { searchParams } = new URL(request.url)
  const className = searchParams.get('className')

  if (!className || !CLASS_LIST.includes(className)) {
    return NextResponse.json({ error: "Invalid class name" }, { status: 400 })
  }

  try {
    await prisma.$transaction(async (tx) => {
      const ct = await tx.classTeacher.findUnique({ where: { className } })
      if (!ct) return

      await tx.classTeacher.delete({ where: { className } })

      await tx.auditLog.create({
        data: {
          action: "CLASS_TEACHER_REMOVED",
          performedBy: session.user.id,
          targetId: ct.id,
          note: `Removed class teacher for class ${className}`
        }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("Failed to remove class teacher:", error)
    return NextResponse.json({ error: "Failed to remove class teacher" }, { status: 500 })
  }
}
