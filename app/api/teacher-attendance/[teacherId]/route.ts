import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"
import { calculateSalary } from "@/lib/salaryCalculator"
import { startOfMonth, endOfMonth } from "date-fns"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  const { errorResponse } = await validateSession(["ADMIN"])
  if (errorResponse) return errorResponse

  const { teacherId } = await params
  const { searchParams } = new URL(request.url)
  const monthParam = searchParams.get("month")
  const yearParam = searchParams.get("year")

  if (!monthParam || !yearParam) {
    return NextResponse.json({ error: "month and year are required" }, { status: 400 })
  }

  const month = parseInt(monthParam)
  const year = parseInt(yearParam)

  if (month < 1 || month > 12 || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Invalid month or year" }, { status: 400 })
  }

  try {
    const monthStart = startOfMonth(new Date(year, month - 1))
    const monthEnd = endOfMonth(new Date(year, month - 1))

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: {
        user: { select: { name: true } },
        salaryConfig: true,
      },
    })

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
    }

    const records = await prisma.teacherAttendance.findMany({
      where: {
        teacherId,
        date: { gte: monthStart, lte: monthEnd },
      },
      orderBy: { date: "asc" },
    })

    let breakdown = null
    if (teacher.salaryConfig) {
      breakdown = calculateSalary(
        teacher.salaryConfig.baseSalary,
        records,
        month,
        year
      )
    }

    return NextResponse.json({
      teacher: {
        id: teacher.id,
        name: teacher.user.name,
        employeeId: teacher.employeeId,
      },
      records,
      breakdown,
    })
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
