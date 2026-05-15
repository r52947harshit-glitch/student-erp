import logger from "@/lib/logger"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { startOfMonth, subMonths, format, startOfDay, endOfDay } from "date-fns"
import { validateSession } from "@/lib/apiAuth"

export async function GET() {
  const { errorResponse } = await validateSession(["ADMIN"])
  if (errorResponse) return errorResponse

  try {
    // 1. Total Active Students
    const totalStudents = await prisma.student.count({
      where: { user: { isActive: true } }
    })

    // 1b. Total Active Teachers
    const totalTeachers = await prisma.user.count({
      where: { role: "TEACHER", isActive: true }
    })


    // 2. Fee Collected This Month
    const thisMonthStart = startOfMonth(new Date())
    const feeCollectedResult = await prisma.payment.aggregate({
      where: {
        status: "PAID",
        verifiedAt: { gte: thisMonthStart }
      },
      _sum: { amount: true }
    })
    const feeCollected = feeCollectedResult._sum.amount || 0

    // 3. Pending Fee Count (Unique students with pending payments)
    const pendingPayments = await prisma.payment.findMany({
      where: { status: "PENDING" },
      select: { studentId: true },
      distinct: ['studentId']
    })
    const pendingFeeCount = pendingPayments.length

    // 4. Attendance Marked Today
    const todayStart = startOfDay(new Date())
    const todayEnd = endOfDay(new Date())
    
    const attendanceStats = await prisma.attendance.groupBy({
      by: ['status'],
      where: {
        date: { gte: todayStart, lte: todayEnd }
      },
      _count: true
    })
    
    let attendanceSummary = "No"
    if (attendanceStats.length > 0) {
      const sum = attendanceStats.reduce((acc, curr) => acc + curr._count, 0)
      attendanceSummary = `Yes (${sum} records)`
    }

    // Chart 1: Bar chart - Monthly fee collection (last 6 months)
    const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5))
    const paymentsLast6Months = await prisma.payment.findMany({
      where: {
        status: "PAID",
        verifiedAt: { gte: sixMonthsAgo }
      },
      select: { amount: true, verifiedAt: true }
    })

    const monthlyDataMap = new Map()
    for (let i = 5; i >= 0; i--) {
      const m = startOfMonth(subMonths(new Date(), i))
      monthlyDataMap.set(format(m, 'MMM yyyy'), 0)
    }

    paymentsLast6Months.forEach(payment => {
      if (payment.verifiedAt) {
        const month = format(payment.verifiedAt, 'MMM yyyy')
        if (monthlyDataMap.has(month)) {
          monthlyDataMap.set(month, monthlyDataMap.get(month) + payment.amount)
        }
      }
    })

    const feeCollectionChart = Array.from(monthlyDataMap.keys()).map(key => ({
      name: key,
      total: monthlyDataMap.get(key)
    }))

    // Chart 2: Pie chart - Student count per class
    const studentsPerClass = await prisma.student.groupBy({
      by: ['class'],
      where: { user: { isActive: true } },
      _count: true
    })

    const classDistributionChart = studentsPerClass.map(item => ({
      name: item.class,
      value: item._count
    }))

    // Salary Metrics
    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()

    const activeTeachersWithConfig = await prisma.teacherSalaryConfig.count()
    const paidThisMonth = await prisma.salaryPayment.findMany({
      where: { month: currentMonth, year: currentYear, status: "PAID" },
    })
    const totalSalaryPaid = paidThisMonth.reduce((sum, p) => sum + p.netSalary, 0)
    const salaryDueCount = activeTeachersWithConfig - paidThisMonth.length

    return NextResponse.json({
      metrics: {
        totalStudents,
        totalTeachers,
        feeCollected,
        pendingFeeCount,
        attendanceSummary,
        salaryDueCount: Math.max(0, salaryDueCount),
        totalSalaryPaid,
      },
      charts: {
        feeCollection: feeCollectionChart,
        classDistribution: classDistributionChart
      }
    })
  } catch (error) {
    logger.error("Dashboard API Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

