import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"
import { calculateSalary } from "@/lib/salaryCalculator"
import { startOfMonth, endOfMonth } from "date-fns"

function maskAccountNumber(acc: string): string {
  if (acc.length <= 4) return acc
  return "••••••" + acc.slice(-4)
}

export async function GET(request: Request) {
  const { errorResponse } = await validateSession(["ADMIN"])
  if (errorResponse) return errorResponse

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

    const teachers = await prisma.teacher.findMany({
      include: {
        user: { select: { name: true, isActive: true } },
        salaryConfig: true,
        attendance: {
          where: { date: { gte: monthStart, lte: monthEnd } },
        },
      },
      orderBy: { employeeId: "asc" },
    })

    const activeTeachers = teachers.filter(t => t.user.isActive)

    // Check existing payments for this month
    const existingPayments = await prisma.salaryPayment.findMany({
      where: { month, year },
    })
    const paymentMap = new Map(existingPayments.map(p => [p.teacherId, p]))

    const results = activeTeachers.map(t => {
      const breakdown = t.salaryConfig
        ? calculateSalary(t.salaryConfig.baseSalary, t.attendance, month, year)
        : null

      return {
        teacher: {
          id: t.id,
          name: t.user.name,
          employeeId: t.employeeId,
          photoUrl: t.photoUrl,
        },
        salaryConfig: t.salaryConfig
          ? {
              baseSalary: t.salaryConfig.baseSalary,
              bankName: t.salaryConfig.bankName,
              bankAccountMasked: maskAccountNumber(t.salaryConfig.bankAccountNumber),
            }
          : null,
        breakdown,
        existingPayment: paymentMap.get(t.id) || null,
        razorpayReady: !!t.salaryConfig?.razorpayFundAccountId,
      }
    })

    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
