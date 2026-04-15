import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"
import { startOfDay, endOfDay } from "date-fns"

export async function GET() {
  const { errorResponse, session } = await validateSession(["TEACHER"])
  if (errorResponse) return errorResponse

  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
    })

    if (!teacher) return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 })

    const assignedClasses = teacher.assignedClasses || []

    // Map through assigned classes and check if attendance exists TODAY
    const todayStart = startOfDay(new Date())
    const todayEnd = endOfDay(new Date())

    const attendanceStatus = await Promise.all(
      assignedClasses.map(async (className) => {
        const markedRecord = await prisma.attendance.findFirst({
          where: {
            date: { gte: todayStart, lte: todayEnd },
            student: { class: className }
          }
        })
        return {
          class: className,
          isMarked: !!markedRecord
        }
      })
    )

    // Check for pending results: simple count of students without results?
    // An approximation is getting counts of total results entered by this teacher.
    // For simplicity of MVP metric, we just pass down standard analytics payload.

    return NextResponse.json({
      teacher,
      attendanceStatus
    })
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
