import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"
import { notifyFeeDueReminder } from "@/lib/notificationService"

export async function POST(request: Request) {
  const { errorResponse, session } = await validateSession(["ADMIN"])
  if (errorResponse || !session) return errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const now = new Date()
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(now.getDate() + 3)

    // Find fee structures due in next 3 days
    const fees = await prisma.feeStructure.findMany({
      where: {
        dueDate: {
          gt: now,
          lte: threeDaysFromNow
        }
      }
    })

    if (fees.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: "No fees due soon" })
    }

    let reminderCount = 0

    // For each fee, find students in that class who haven't paid
    for (const fee of fees) {
      const studentsInClass = await prisma.student.findMany({
        where: { class: fee.class },
        select: { id: true, userId: true, user: { select: { isActive: true } } }
      })

      for (const student of studentsInClass) {
        if (!student.user.isActive) continue;

        // Check if student has paid this specific fee
        // Assuming fee.type maps to payment.type
        const existingPayment = await prisma.payment.findFirst({
          where: {
            studentId: student.id,
            type: fee.type,
            status: "PAID"
          }
        })

        if (!existingPayment) {
          await notifyFeeDueReminder(student.userId, fee.type, fee.amount, fee.dueDate)
          reminderCount++
        }
      }
    }

    return NextResponse.json({ success: true, count: reminderCount })
  } catch (error) {
    return NextResponse.json({ error: "Failed to process fee reminders" }, { status: 500 })
  }
}
