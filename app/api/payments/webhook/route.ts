import logger from "@/lib/logger"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

export async function POST(req: Request) {
  try {
    const bodyText = await req.text()
    const signature = req.headers.get("x-razorpay-signature")
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET

    if (!secret) return new NextResponse("Webhook secret not configured", { status: 500 })
    if (!signature) return new NextResponse("Missing signature", { status: 400 })

    // Verify cryptographic signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(bodyText)
      .digest("hex")

    if (expectedSignature !== signature) {
      logger.error("Critical Security Event: Forged Razorpay Webhook Trapped.")
      return new NextResponse("Invalid signature spoofing attempt logged", { status: 400 })
    }

    const payload = JSON.parse(bodyText)

    if (payload.event === "payment.captured" || payload.event === "order.paid") {
       // Locate the payment entity dynamically (Event format structure depends heavily on webhook hook types).
       // Standard order.paid passes entity directly representing the order
       const order_id = payload.payload?.payment?.entity?.order_id || payload.payload?.order?.entity?.id
       const payment_id = payload.payload?.payment?.entity?.id || ""

       if (order_id) {
           const dbPayment = await prisma.payment.findUnique({ where: { razorpayOrderId: order_id } })
           
           if (dbPayment && dbPayment.status === "PENDING") {
               const updated = await prisma.payment.update({
                 where: { id: dbPayment.id },
                 data: {
                   status: "PAID",
                   razorpayPaymentId: payment_id,
                   verifiedAt: new Date()
                 }
               })

               // Generate internal audit tracking to alert Admins that a student transaction resolved out-of-band via Razorpay.
               await prisma.auditLog.create({
                 data: {
                   action: "RAZORPAY_PAYMENT_VERIFIED",
                   performedBy: "SYSTEM_WEBHOOK",
                   targetId: updated.studentId,
                   note: `Automated confirmation of ${updated.type} for amount ${updated.amount}`
                 }
               })
           }
       }
    } else if (payload.event === "payment.failed") {
       const order_id = payload.payload?.payment?.entity?.order_id
       if (order_id) {
           await prisma.payment.update({
             where: { razorpayOrderId: order_id },
             data: { status: "FAILED" }
           })
       }
    }

    return NextResponse.json({ status: "ok" })
  } catch (error) {
    logger.error("Webhook processing error:", error)
    return new NextResponse("Webhook process failed", { status: 500 })
  }
}

