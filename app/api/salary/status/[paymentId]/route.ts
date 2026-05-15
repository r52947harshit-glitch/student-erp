import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"
import { getPayoutStatus } from "@/lib/razorpayPayout"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { errorResponse } = await validateSession(["ADMIN"])
  if (errorResponse) return errorResponse

  const { paymentId } = await params

  try {
    const payment = await prisma.salaryPayment.findUnique({
      where: { id: paymentId },
      include: {
        teacher: {
          include: { user: { select: { name: true } } },
        },
      },
    })

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    // Sync with Razorpay if payout ID exists
    if (payment.razorpayPayoutId) {
      try {
        const liveStatus = await getPayoutStatus(payment.razorpayPayoutId)
        const razorpayStatus = liveStatus.status

        // Map Razorpay status to our status
        let newStatus = payment.status
        if (razorpayStatus === "processed") newStatus = "PAID"
        else if (razorpayStatus === "reversed" || razorpayStatus === "failed" || razorpayStatus === "cancelled")
          newStatus = "FAILED"
        else if (razorpayStatus === "processing" || razorpayStatus === "queued")
          newStatus = "PROCESSING"

        // Update DB if status differs
        if (newStatus !== payment.status) {
          await prisma.salaryPayment.update({
            where: { id: paymentId },
            data: {
              status: newStatus as any,
              failureReason: newStatus === "FAILED" ? `Razorpay: ${razorpayStatus}` : null,
              processedAt: newStatus === "PAID" ? new Date() : payment.processedAt,
            },
          })
          payment.status = newStatus as any
        }

        return NextResponse.json({
          ...payment,
          teacherName: payment.teacher.user.name,
          razorpayLiveStatus: razorpayStatus,
        })
      } catch {
        // If Razorpay call fails, return DB status
        return NextResponse.json({
          ...payment,
          teacherName: payment.teacher.user.name,
          razorpayLiveStatus: null,
        })
      }
    }

    return NextResponse.json({
      ...payment,
      teacherName: payment.teacher.user.name,
      razorpayLiveStatus: null,
    })
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
