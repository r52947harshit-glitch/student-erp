import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns"

export async function GET(request: Request) {
  const { errorResponse } = await validateSession(["ADMIN"])
  if (errorResponse) return errorResponse

  const { searchParams } = new URL(request.url)
  const dateParam = searchParams.get("date")
  const monthParam = searchParams.get("month")
  const yearParam = searchParams.get("year")

  try {
    // Single date mode
    if (dateParam) {
      const date = new Date(dateParam)
      const dayStart = startOfDay(date)
      const dayEnd = endOfDay(date)

      const teachers = await prisma.teacher.findMany({
        include: {
          user: { select: { name: true, email: true, isActive: true } },
          attendance: {
            where: { date: { gte: dayStart, lte: dayEnd } },
          },
        },
        orderBy: { employeeId: "asc" },
      })

      // Only active teachers
      const activeTeachers = teachers.filter(t => t.user.isActive)

      return NextResponse.json({
        date: dateParam,
        teachers: activeTeachers.map(t => ({
          id: t.id,
          name: t.user.name,
          employeeId: t.employeeId,
          photoUrl: t.photoUrl,
          attendance: t.attendance[0] || null,
        })),
      })
    }

    // Monthly summary mode
    if (monthParam && yearParam) {
      const month = parseInt(monthParam)
      const year = parseInt(yearParam)
      const monthStart = startOfMonth(new Date(year, month - 1))
      const monthEnd = endOfMonth(new Date(year, month - 1))

      const teachers = await prisma.teacher.findMany({
        include: {
          user: { select: { name: true, isActive: true } },
          attendance: {
            where: { date: { gte: monthStart, lte: monthEnd } },
          },
        },
        orderBy: { employeeId: "asc" },
      })

      const activeTeachers = teachers.filter(t => t.user.isActive)

      return NextResponse.json({
        month, year,
        teachers: activeTeachers.map(t => {
          const present = t.attendance.filter(a => a.status === "PRESENT").length
          const absent = t.attendance.filter(a => a.status === "ABSENT").length
          const halfDay = t.attendance.filter(a => a.status === "HALF_DAY").length
          const paidLeave = t.attendance.filter(a => a.status === "PAID_LEAVE").length
          const unpaidLeave = t.attendance.filter(a => a.status === "UNPAID_LEAVE").length
          return {
            id: t.id,
            name: t.user.name,
            employeeId: t.employeeId,
            photoUrl: t.photoUrl,
            summary: { present, absent, halfDay, paidLeave, unpaidLeave, total: t.attendance.length },
          }
        }),
      })
    }

    return NextResponse.json({ error: "Provide date or month+year query params" }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { errorResponse, session } = await validateSession(["ADMIN"])
  if (errorResponse || !session) return errorResponse

  try {
    const body = await request.json()
    const { date, records } = body

    if (!date || !records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: "date and records[] are required" }, { status: 400 })
    }

    const parsedDate = new Date(date)
    if (parsedDate > new Date()) {
      return NextResponse.json({ error: "Cannot mark attendance for future dates" }, { status: 400 })
    }

    const validStatuses = ["PRESENT", "ABSENT", "HALF_DAY", "PAID_LEAVE", "UNPAID_LEAVE"]
    const attendanceDate = startOfDay(parsedDate)

    let count = 0
    for (const record of records) {
      if (!record.teacherId || !validStatuses.includes(record.status)) continue

      await prisma.teacherAttendance.upsert({
        where: {
          teacherId_date: { teacherId: record.teacherId, date: attendanceDate },
        },
        create: {
          teacherId: record.teacherId,
          date: attendanceDate,
          status: record.status,
          markedBy: session.user.id,
          note: record.note || null,
        },
        update: {
          status: record.status,
          markedBy: session.user.id,
          note: record.note || null,
        },
      })
      count++
    }

    await prisma.auditLog.create({
      data: {
        action: "TEACHER_ATTENDANCE_MARKED",
        performedBy: session.user.id,
        targetId: date,
        note: `Marked attendance for ${count} teachers on ${date}`,
      },
    })

    return NextResponse.json({ success: true, count })
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
