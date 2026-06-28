import logger from "@/lib/logger"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"
import { razorpay } from "@/lib/razorpay"
import { paymentSchema } from "@/lib/validations"
import { handlePrismaError } from "@/lib/prisma-error"

export async function POST(request: Request) {
  const { errorResponse, session } = await validateSession(["STUDENT"])
  if (errorResponse || !session) return errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!razorpay) {
    return NextResponse.json({ error: "Payment gateway not configured." }, { status: 503 })
  }

  try {
    const body = await request.json()
    const parseResult = paymentSchema.safeParse(body)
    
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.issues[0].message }, { status: 400 })
    }

    const { type } = parseResult.data

    const student = await prisma.student.findUnique({
      where: { userId: session.user.id }
    })
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 })

    // Security 1: Fetch correct amount from FeeStructure DB instead of trusting request body
    const feeStructure = await prisma.feeStructure.findFirst({
      where: {
        class: student.class,
        type: type
      }
    })

    if (!feeStructure) {
      return NextResponse.json({ error: `No fee structure defined for class ${student.class} and type ${type}` }, { status: 404 })
    }

    const correctAmount = feeStructure.amount

    // Rate Limiting: 3 orders per minute per student
    const oneMinuteAgo = new Date(Date.now() - 60000)
    const recentOrdersCount = await prisma.payment.count({
      where: {
        studentId: student.id,
        createdAt: { gte: oneMinuteAgo }
      }
    })

    if (recentOrdersCount >= 3) {
      return NextResponse.json({ error: "Too many payment attempts. Please wait a minute before trying again." }, { status: 429 })
    }

    // Create Order with Razorpay SDK
    const orderOptions = {
      amount: Math.round(correctAmount * 100), // convert to smallest currency unit (paise)
      currency: "INR",
      receipt: `rcpt_${student.rollNo}_${Date.now()}`
    }

    const order = await razorpay.orders.create(orderOptions)

    // Log the intended checkout constraint in Prisma locked explicitly to this student
    await prisma.payment.create({
      data: {
        studentId: student.id,
        razorpayOrderId: order.id,
        amount: correctAmount,
        type: type,
        status: "PENDING"
      }
    })

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID // Safe to expose public key
    })

  } catch (error: any) {
    logger.error("Payment Flow Error:", error)
    return handlePrismaError(error, "Failed to initialize payment gateway")
  }
}

