import logger from "@/lib/logger"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { startOfMonth, subMonths, format, startOfDay, endOfDay } from "date-fns"
import { validateSession } from "@/lib/apiAuth"
import { CLASS_LIST } from "@/lib/constants"

export async function GET() {
  const { errorResponse } = await validateSession(["ADMIN"])
  if (errorResponse) return errorResponse

  try {
    const thisMonthStart = startOfMonth(new Date())
    const todayStart = startOfDay(new Date())
    const todayEnd = endOfDay(new Date())
    const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5))
    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()

    // Execute all independent database queries in parallel
    const [
      totalStudents,
      totalTeachers,
      feeCollectedResult,
      pendingPayments,
      attendanceStats,
      paymentsLast6Months,
      studentsPerClass,
      activeTeachersWithConfig,
      paidThisMonth,
      classTeacherCount
    ] = await Promise.all([
      // 1. Total Active Students
      prisma.student.count({
        where: { user: { isActive: true } }
      }),

      // 1b. Total Active Teachers
      prisma.user.count({
        where: { role: "TEACHER", isActive: true }
      }),

      // 2. Fee Collected This Month
      prisma.payment.aggregate({
        where: {
          status: "PAID",
          verifiedAt: { gte: thisMonthStart }
        },
        _sum: { amount: true }
      }),

      // 3. Pending Fee Count (Unique students with pending payments)
      prisma.payment.findMany({
        where: { status: "PENDING" },
        select: { studentId: true },
        distinct: ['studentId']
      }),

      // 4. Attendance Marked Today
      prisma.attendance.groupBy({
        by: ['status'],
        where: {
          date: { gte: todayStart, lte: todayEnd }
        },
        _count: true
      }),

      // Chart 1: Bar chart - Monthly fee collection (last 6 months)
      prisma.payment.findMany({
        where: {
          status: "PAID",
          verifiedAt: { gte: sixMonthsAgo }
        },
        select: { amount: true, verifiedAt: true }
      }),

      // Chart 2: Pie chart - Student count per class
      prisma.student.groupBy({
        by: ['class'],
        where: { user: { isActive: true } },
        _count: true
      }),

      // Salary Metrics - active teachers config count
      prisma.teacherSalaryConfig.count(),

      // Salary Metrics - payments this month
      prisma.salaryPayment.findMany({
        where: { month: currentMonth, year: currentYear, status: "PAID" },
      }),

      // Class Teacher metrics
      prisma.classTeacher.count()
    ])

    const feeCollected = feeCollectedResult._sum.amount || 0
    const pendingFeeCount = pendingPayments.length

    let attendanceSummary = "No"
    if (attendanceStats.length > 0) {
      const sum = attendanceStats.reduce((acc, curr) => acc + curr._count, 0)
      attendanceSummary = `Yes (${sum} records)`
    }

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

    const classDistributionChart = studentsPerClass.map(item => ({
      name: item.class,
      value: item._count
    }))

    const totalSalaryPaid = paidThisMonth.reduce((sum, p) => sum + p.netSalary, 0)
    const salaryDueCount = activeTeachersWithConfig - paidThisMonth.length
    const classesWithoutTeacher = Math.max(0, CLASS_LIST.length - classTeacherCount)

    return NextResponse.json({
      metrics: {
        totalStudents,
        totalTeachers,
        feeCollected,
        pendingFeeCount,
        attendanceSummary,
        salaryDueCount: Math.max(0, salaryDueCount),
        totalSalaryPaid,
        classesWithoutTeacher,
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

