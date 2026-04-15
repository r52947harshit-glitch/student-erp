import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"
import { startOfMonth, endOfMonth } from "date-fns"

export async function GET(request: Request) {
  const { errorResponse, session } = await validateSession(["STUDENT"])
  if (errorResponse) return errorResponse

  const { searchParams } = new URL(request.url)
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

  try {
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id }
    })

    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 })

    // Build date range for the requested month
    const targetDate = new Date(year, month - 1, 1) // month is 1-indexed from frontend
    const rangeStart = startOfMonth(targetDate)
    const rangeEnd = endOfMonth(targetDate)

    const records = await prisma.attendance.findMany({
      where: {
        studentId: student.id,
        date: { gte: rangeStart, lte: rangeEnd }
      },
      orderBy: { date: "asc" }
    })

    // Overall stats (not just this month — full history for the percentage)
    const allRecords = await prisma.attendance.findMany({
      where: { studentId: student.id }
    })

    const totalDays = allRecords.length
    const presentDays = allRecords.filter(r => r.status === "PRESENT").length
    const absentDays = allRecords.filter(r => r.status === "ABSENT").length
    const leaveDays = allRecords.filter(r => r.status === "LEAVE").length
    const percentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : "100.0"

    return NextResponse.json({
      records: records.map(r => ({
        date: r.date,
        status: r.status
      })),
      stats: { totalDays, presentDays, absentDays, leaveDays, percentage }
    })
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
