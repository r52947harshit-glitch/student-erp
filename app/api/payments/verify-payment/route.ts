import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"
import { handlePrismaError } from "@/lib/prisma-error"
import logger from "@/lib/logger"
import crypto from "crypto"

export async function POST(request: Request) {
  const { errorResponse, session } = await validateSession(["STUDENT"])
  if (errorResponse) return errorResponse

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json()

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing required verification fields." },
        { status: 400 }
      )
    }

    const secret = process.env.RAZORPAY_KEY_SECRET
    if (!secret) {
      return NextResponse.json(
        { error: "Payment gateway is not fully configured on the server." },
        { status: 500 }
      )
    }

    // Verify cryptographic signature
    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex")

    if (generatedSignature !== razorpay_signature) {
      logger.error("Razorpay Signature Verification Failed.")
      return NextResponse.json(
        { error: "Invalid payment signature verification failed." },
        { status: 400 }
      )
    }

    // Process the payment status update in database
    const dbPayment = await prisma.payment.findUnique({
      where: { razorpayOrderId: razorpay_order_id }
    })

    if (!dbPayment) {
      return NextResponse.json({ error: "Order record not found" }, { status: 404 })
    }

    // Security check: ensure student matches payment record
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id }
    })

    if (!student || dbPayment.studentId !== student.id) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 })
    }

    if (dbPayment.status !== "PAID") {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: dbPayment.id },
          data: {
            status: "PAID",
            razorpayPaymentId: razorpay_payment_id,
            verifiedAt: new Date()
          }
        })

        await tx.auditLog.create({
          data: {
            action: "RAZORPAY_PAYMENT_VERIFIED",
            performedBy: session.user.id,
            targetId: student.id,
            note: `Successfully verified fee payment for type ${dbPayment.type} and amount ${dbPayment.amount}`
          }
        })
      })
    }

    return NextResponse.json({
      status: "PAID",
      amount: dbPayment.amount,
      type: dbPayment.type,
      razorpayPaymentId: razorpay_payment_id,
      verifiedAt: new Date().toISOString()
    })

  } catch (error: any) {
    logger.error("Verify Payment Route Error:", error)
    return handlePrismaError(error, "Failed to verify signature.")
  }
}
