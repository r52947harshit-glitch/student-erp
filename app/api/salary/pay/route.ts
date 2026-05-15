import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"
import { calculateSalary } from "@/lib/salaryCalculator"
import { createSalaryPayout } from "@/lib/razorpayPayout"
import { startOfMonth, endOfMonth } from "date-fns"

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

export async function POST(request: Request) {
  const { errorResponse, session } = await validateSession(["ADMIN"])
  if (errorResponse || !session) return errorResponse

  try {
    const body = await request.json()
    const { teacherId, month, year } = body

    if (!teacherId || !month || !year) {
      return NextResponse.json({ error: "teacherId, month, year are required" }, { status: 400 })
    }

    // 1. Fetch teacher — must exist and be active
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: {
        user: { select: { name: true, isActive: true } },
        salaryConfig: true,
      },
    })

    if (!teacher || !teacher.user.isActive) {
      return NextResponse.json({ error: "Teacher not found or inactive" }, { status: 404 })
    }

    // 2. Salary config must exist with Razorpay fund account
    if (!teacher.salaryConfig) {
      return NextResponse.json({ error: "Salary not configured for this teacher" }, { status: 400 })
    }

    if (!teacher.salaryConfig.razorpayFundAccountId) {
      return NextResponse.json({ error: "Bank details not configured for this teacher" }, { status: 400 })
    }

    // 3. Check for existing payment
    const existing = await prisma.salaryPayment.findUnique({
      where: { teacherId_month_year: { teacherId, month, year } },
    })

    if (existing) {
      if (existing.status === "PAID") {
        return NextResponse.json({ error: "Salary already paid for this month" }, { status: 409 })
      }
      if (existing.status === "PROCESSING") {
        return NextResponse.json({ error: "Payment already in progress" }, { status: 409 })
      }
    }

    // 4. Recalculate salary from DB attendance (never trust client)
    const monthStart = startOfMonth(new Date(year, month - 1))
    const monthEnd = endOfMonth(new Date(year, month - 1))

    const attendance = await prisma.teacherAttendance.findMany({
      where: {
        teacherId,
        date: { gte: monthStart, lte: monthEnd },
      },
    })

    const breakdown = calculateSalary(
      teacher.salaryConfig.baseSalary,
      attendance,
      month,
      year
    )

    if (breakdown.netSalary <= 0) {
      return NextResponse.json({ error: "Net salary is zero, cannot process" }, { status: 400 })
    }

    // 5. Create or update payment record as PROCESSING
    const payment = existing
      ? await prisma.salaryPayment.update({
          where: { id: existing.id },
          data: {
            status: "PROCESSING",
            baseSalary: breakdown.baseSalary,
            totalWorkingDays: breakdown.totalWorkingDays,
            presentDays: breakdown.presentDays,
            halfDays: breakdown.halfDays,
            paidLeaveDays: breakdown.paidLeaveDays,
            unpaidLeaveDays: breakdown.unpaidLeaveDays,
            absentDays: breakdown.absentDays,
            deductionAmount: breakdown.deductionAmount,
            netSalary: breakdown.netSalary,
            failureReason: null,
          },
        })
      : await prisma.salaryPayment.create({
          data: {
            teacherId,
            month,
            year,
            baseSalary: breakdown.baseSalary,
            totalWorkingDays: breakdown.totalWorkingDays,
            presentDays: breakdown.presentDays,
            halfDays: breakdown.halfDays,
            paidLeaveDays: breakdown.paidLeaveDays,
            unpaidLeaveDays: breakdown.unpaidLeaveDays,
            absentDays: breakdown.absentDays,
            deductionAmount: breakdown.deductionAmount,
            netSalary: breakdown.netSalary,
            status: "PROCESSING",
            processedBy: session.user.id,
          },
        })

    // 6. Call Razorpay Payout
    try {
      const payout = await createSalaryPayout({
        fundAccountId: teacher.salaryConfig.razorpayFundAccountId,
        amountInPaise: Math.round(breakdown.netSalary * 100),
        teacherName: teacher.user.name,
        month: MONTH_NAMES[month],
        year,
        paymentId: payment.id,
      })

      // Success — update to PAID
      await prisma.salaryPayment.update({
        where: { id: payment.id },
        data: {
          status: "PAID",
          razorpayPayoutId: payout.id,
          processedAt: new Date(),
        },
      })

      await prisma.auditLog.create({
        data: {
          action: "SALARY_PAID",
          performedBy: session.user.id,
          targetId: payment.id,
          note: `Salary ₹${breakdown.netSalary} paid to ${teacher.user.name} (${MONTH_NAMES[month]} ${year}). Payout ID: ${payout.id}`,
        },
      })

      return NextResponse.json({
        success: true,
        paymentId: payment.id,
        razorpayPayoutId: payout.id,
        netSalary: breakdown.netSalary,
        status: "PAID",
      })
    } catch (rpError: any) {
      // Razorpay failed — update to FAILED
      await prisma.salaryPayment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          failureReason: rpError.message || "Razorpay payout failed",
        },
      })

      await prisma.auditLog.create({
        data: {
          action: "SALARY_PAYMENT_FAILED",
          performedBy: session.user.id,
          targetId: payment.id,
          note: `Salary payment failed for ${teacher.user.name}: ${rpError.message}`,
        },
      })

      return NextResponse.json(
        { error: rpError.message || "Razorpay payout failed" },
        { status: 502 }
      )
    }
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
