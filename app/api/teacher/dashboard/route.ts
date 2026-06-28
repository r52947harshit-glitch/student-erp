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
      include: { assignedClasses: true }
    })

    if (!teacher) return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 })

    const assignedClasses = teacher.assignedClasses || []

    // Map through assigned classes and check if attendance exists TODAY
    const todayStart = startOfDay(new Date())
    const todayEnd = endOfDay(new Date())

    const [attendanceStatus, pendingReviews] = await Promise.all([
      Promise.all(
        assignedClasses.map(async (ac) => {
          const markedRecord = await prisma.attendance.findFirst({
            where: {
              date: { gte: todayStart, lte: todayEnd },
              student: { class: ac.className }
            }
          })
          return {
            class: ac.className,
            isMarked: !!markedRecord
          }
        })
      ),
      prisma.assignmentSubmission.count({
        where: {
          status: "SUBMITTED",
          assignment: { teacherId: teacher.id }
        }
      })
    ])

    return NextResponse.json({
      teacher,
      attendanceStatus,
      pendingReviews
    })
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
