import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"
import logger from "@/lib/logger"

export async function GET() {
  const { errorResponse, session } = await validateSession(["TEACHER"])
  if (errorResponse || !session) return errorResponse

  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    })

    if (!teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 })
    }

    const classTeacher = await prisma.classTeacher.findUnique({
      where: { teacherId: teacher.id }
    })

    if (classTeacher) {
      return NextResponse.json({
        isClassTeacher: true,
        className: classTeacher.className
      })
    } else {
      return NextResponse.json({
        isClassTeacher: false
      })
    }
  } catch (error) {
    logger.error("Failed to fetch my class:", error)
    return NextResponse.json({ error: "Failed to fetch my class" }, { status: 500 })
  }
}
