import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"

export async function GET(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  const { errorResponse, session } = await validateSession(["STUDENT"])
  if (errorResponse) return errorResponse

  try {
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id }
    })

    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 })

    const payment = await prisma.payment.findUnique({
      where: { razorpayOrderId: params.orderId }
    })

    if (!payment) return NextResponse.json({ error: "Order not found" }, { status: 404 })

    // SECURITY: Ensure payment belongs to this student
    if (payment.studentId !== student.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json({
      status: payment.status,
      razorpayPaymentId: payment.razorpayPaymentId,
      verifiedAt: payment.verifiedAt,
      amount: payment.amount,
      type: payment.type
    })
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
