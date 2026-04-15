import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"
import { handlePrismaError } from "@/lib/prisma-error"

export async function GET(request: Request) {
  const { errorResponse } = await validateSession(["ADMIN"])
  if (errorResponse) return errorResponse

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  
  try {
    const payments = await prisma.payment.findMany({
      where: {
        ...(status && status !== 'ALL' && { status: status as any })
      },
      include: {
        student: { select: { class: true, user: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(payments)
  } catch (error) {
    return handlePrismaError(error, "Failed to fetch payments")
  }
}

export async function POST(request: Request) {
  const { errorResponse, session } = await validateSession(["ADMIN"])
  if (errorResponse) return errorResponse

  try {
    const { studentId, type, amount, note } = await request.json()
    
    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          studentId,
          type,
          amount: parseFloat(amount),
          status: "PAID",
          verifiedAt: new Date(),
          razorpayOrderId: `MANUAL_${Date.now()}` // generate dummy unique ID
        }
      })
      
      await tx.auditLog.create({
        data: {
          action: "MANUAL_PAYMENT",
          performedBy: session.user.id,
          targetId: p.id,
          note
        }
      })
      return p
    })
    return NextResponse.json(payment)
  } catch (error) {
    return handlePrismaError(error, "Failed to create manual payment")
  }
}
