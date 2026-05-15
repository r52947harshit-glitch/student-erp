import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"
import { createRazorpayContact, createFundAccount } from "@/lib/razorpayPayout"

function maskAccountNumber(acc: string): string {
  if (acc.length <= 4) return acc
  return "••••••" + acc.slice(-4)
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  const { errorResponse } = await validateSession(["ADMIN"])
  if (errorResponse) return errorResponse

  const { teacherId } = await params

  try {
    const config = await prisma.teacherSalaryConfig.findUnique({
      where: { teacherId },
      include: { teacher: { include: { user: { select: { name: true } } } } },
    })

    if (!config) {
      return NextResponse.json({ error: "No salary config found" }, { status: 404 })
    }

    return NextResponse.json({
      ...config,
      bankAccountNumber: maskAccountNumber(config.bankAccountNumber),
    })
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  const { errorResponse, session } = await validateSession(["ADMIN"])
  if (errorResponse || !session) return errorResponse

  const { teacherId } = await params

  try {
    const body = await request.json()
    const existing = await prisma.teacherSalaryConfig.findUnique({
      where: { teacherId },
    })

    if (!existing) {
      return NextResponse.json({ error: "Config not found. Use POST to create." }, { status: 404 })
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: { user: { select: { name: true, email: true } } },
    })

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
    }

    const updateData: any = {}
    if (body.baseSalary) updateData.baseSalary = body.baseSalary
    if (body.accountHolderName) updateData.accountHolderName = body.accountHolderName
    if (body.bankAccountNumber) updateData.bankAccountNumber = body.bankAccountNumber
    if (body.ifscCode) updateData.ifscCode = body.ifscCode
    if (body.bankName) updateData.bankName = body.bankName

    const updated = await prisma.teacherSalaryConfig.update({
      where: { teacherId },
      data: updateData,
    })

    // Re-register with Razorpay if bank details changed
    let razorpayWarning: string | null = null
    const bankChanged = body.bankAccountNumber || body.ifscCode || body.accountHolderName
    if (bankChanged) {
      try {
        const contact = await createRazorpayContact({
          name: teacher.user.name,
          email: teacher.user.email,
          phone: teacher.phone,
          employeeId: teacher.employeeId,
        })
        const fundAccount = await createFundAccount({
          contactId: contact.id,
          accountHolderName: updated.accountHolderName,
          accountNumber: updated.bankAccountNumber,
          ifscCode: updated.ifscCode,
        })
        await prisma.teacherSalaryConfig.update({
          where: { teacherId },
          data: {
            razorpayContactId: contact.id,
            razorpayFundAccountId: fundAccount.id,
          },
        })
      } catch (rpError: any) {
        razorpayWarning = "Config updated but Razorpay re-registration failed: " + rpError.message
      }
    }

    await prisma.auditLog.create({
      data: {
        action: "SALARY_CONFIG_UPDATED",
        performedBy: session.user.id,
        targetId: teacherId,
        note: `Salary config updated for teacher`,
      },
    })

    return NextResponse.json({ success: true, warning: razorpayWarning })
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
