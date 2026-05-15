import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"

export async function GET(request: Request) {
  const { errorResponse } = await validateSession(["ADMIN"])
  if (errorResponse) return errorResponse

  const { searchParams } = new URL(request.url)
  const monthParam = searchParams.get("month")
  const yearParam = searchParams.get("year")
  const teacherIdParam = searchParams.get("teacherId")
  const statusParam = searchParams.get("status")
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "50")
  const skip = (page - 1) * limit

  try {
    const where: any = {}
    if (monthParam) where.month = parseInt(monthParam)
    if (yearParam) where.year = parseInt(yearParam)
    if (teacherIdParam) where.teacherId = teacherIdParam
    if (statusParam) where.status = statusParam

    const [payments, total] = await Promise.all([
      prisma.salaryPayment.findMany({
        where,
        include: {
          teacher: {
            include: {
              user: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.salaryPayment.count({ where }),
    ])

    // Monthly summary
    let summary = null
    if (monthParam && yearParam) {
      const month = parseInt(monthParam)
      const year = parseInt(yearParam)

      const allForMonth = await prisma.salaryPayment.findMany({
        where: { month, year },
      })

      const totalPaid = allForMonth
        .filter(p => p.status === "PAID")
        .reduce((sum, p) => sum + p.netSalary, 0)
      const totalPending = allForMonth
        .filter(p => p.status === "PENDING" || p.status === "PROCESSING")
        .reduce((sum, p) => sum + p.netSalary, 0)
      const totalFailed = allForMonth
        .filter(p => p.status === "FAILED")
        .reduce((sum, p) => sum + p.netSalary, 0)

      summary = {
        month,
        year,
        totalPaid,
        totalPending,
        totalFailed,
        paidCount: allForMonth.filter(p => p.status === "PAID").length,
        pendingCount: allForMonth.filter(p => p.status === "PENDING" || p.status === "PROCESSING").length,
        failedCount: allForMonth.filter(p => p.status === "FAILED").length,
        totalStaff: allForMonth.length,
      }
    }

    return NextResponse.json({
      payments: payments.map(p => ({
        id: p.id,
        teacherId: p.teacherId,
        teacherName: p.teacher.user.name,
        employeeId: p.teacher.employeeId,
        month: p.month,
        year: p.year,
        baseSalary: p.baseSalary,
        deductionAmount: p.deductionAmount,
        netSalary: p.netSalary,
        status: p.status,
        razorpayPayoutId: p.razorpayPayoutId,
        failureReason: p.failureReason,
        processedAt: p.processedAt,
        createdAt: p.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      summary,
    })
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
