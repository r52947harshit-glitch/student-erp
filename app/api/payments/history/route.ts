import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"

export async function GET() {
  const { errorResponse, session } = await validateSession(["STUDENT"])
  if (errorResponse) return errorResponse

  try {
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
      include: {
        payments: true
      }
    })

    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 })

    // Find all expected fees for this student's class
    const expectedFees = await prisma.feeStructure.findMany({
      where: { class: student.class }
    })

    const paidFees: any[] = []
    const pendingFees: any[] = []
    const activeOrders: any[] = [] // tracking intent in progress

    expectedFees.forEach(fee => {
      // Find successfully paid matches
      const paidMatch = student.payments.find(p => p.type === fee.type && p.status === "PAID")
      
      if (paidMatch) {
         // Attach fee structure context (dueDate) to the payment record for history tab
         paidFees.push({ ...paidMatch, dueDate: fee.dueDate })
      } else {
         // It's not paid. Is it pending/processing in razorpay right now?
         const pendingMatch = student.payments.find(p => p.type === fee.type && p.status === "PENDING")
         if (pendingMatch) activeOrders.push(pendingMatch)
         
         pendingFees.push({
           type: fee.type,
           amount: fee.amount,
           dueDate: fee.dueDate,
           activeOrderId: pendingMatch?.razorpayOrderId
         })
      }
    })

    return NextResponse.json({ paidFees, pendingFees, activeOrders })
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
