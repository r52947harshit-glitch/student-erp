import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"
import { z } from "zod"
import { createRazorpayContact, createFundAccount } from "@/lib/razorpayPayout"
import { ApiResponse } from "@/lib/apiResponse"
import logger from "@/lib/logger"

function maskAccountNumber(acc: string): string {
  if (acc.length <= 4) return acc
  return "••••••" + acc.slice(-4)
}

const salaryConfigSchema = z.object({
  teacherId: z.string().min(1),
  baseSalary: z.number().min(1000).max(500000),
  accountHolderName: z.string().min(3).max(100),
  bankAccountNumber: z.string().regex(/^\d{9,18}$/, "Bank account must be 9-18 digits"),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC format"),
  bankName: z.string().min(2),
})

export async function GET(request: Request) {
  const { errorResponse } = await validateSession(["ADMIN"])
  if (errorResponse) return errorResponse

  try {
    const teachers = await prisma.teacher.findMany({
      include: {
        user: { select: { name: true, email: true, isActive: true } },
        salaryConfig: true,
      },
      orderBy: { employeeId: "asc" },
    })

    const activeTeachers = teachers.filter(t => t.user.isActive)

    return NextResponse.json(
      activeTeachers.map(t => ({
        id: t.id,
        name: t.user.name,
        email: t.user.email,
        employeeId: t.employeeId,
        phone: t.phone,
        photoUrl: t.photoUrl,
        salaryConfig: t.salaryConfig
          ? {
              id: t.salaryConfig.id,
              baseSalary: t.salaryConfig.baseSalary,
              accountHolderName: t.salaryConfig.accountHolderName,
              bankAccountMasked: maskAccountNumber(t.salaryConfig.bankAccountNumber),
              ifscCode: t.salaryConfig.ifscCode,
              bankName: t.salaryConfig.bankName,
              razorpayContactId: t.salaryConfig.razorpayContactId,
              razorpayFundAccountId: t.salaryConfig.razorpayFundAccountId,
            }
          : null,
      }))
    )
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { errorResponse, session } = await validateSession(["ADMIN"])
  if (errorResponse || !session) return errorResponse

  try {
    const body = await request.json()
    const parseResult = salaryConfigSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const data = parseResult.data

    const teacher = await prisma.teacher.findUnique({
      where: { id: data.teacherId },
      include: { user: { select: { name: true, email: true } } },
    })

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
    }

    // Save config to DB first
    const config = await prisma.teacherSalaryConfig.upsert({
      where: { teacherId: data.teacherId },
      create: {
        teacherId: data.teacherId,
        baseSalary: data.baseSalary,
        accountHolderName: data.accountHolderName,
        bankAccountNumber: data.bankAccountNumber,
        ifscCode: data.ifscCode,
        bankName: data.bankName,
      },
      update: {
        baseSalary: data.baseSalary,
        accountHolderName: data.accountHolderName,
        bankAccountNumber: data.bankAccountNumber,
        ifscCode: data.ifscCode,
        bankName: data.bankName,
      },
    })

    // Try Razorpay registration
    let razorpayWarning: string | null = null
    let razorpaySuccess = false

    // Only attempt Razorpay if payout keys exist
    const payoutKeyId = process.env.RAZORPAY_PAYOUT_KEY_ID
    const payoutKeySecret = process.env.RAZORPAY_PAYOUT_KEY_SECRET
    const payoutAccountNumber = process.env.RAZORPAY_X_ACCOUNT_NUMBER

    if (!payoutKeyId || !payoutKeySecret || !payoutAccountNumber) {
      razorpayWarning = "Razorpay X Payout keys not configured in environment. " +
        "Add RAZORPAY_PAYOUT_KEY_ID, RAZORPAY_PAYOUT_KEY_SECRET, and " +
        "RAZORPAY_X_ACCOUNT_NUMBER to your .env.local file."
    } else {
      try {
        const contact = await createRazorpayContact({
          name: teacher.user.name,
          email: teacher.user.email,
          phone: teacher.phone,
          employeeId: teacher.employeeId,
        })

        const fundAccount = await createFundAccount({
          contactId: contact.id,
          accountHolderName: data.accountHolderName,
          accountNumber: data.bankAccountNumber,
          ifscCode: data.ifscCode,
        })

        await prisma.teacherSalaryConfig.update({
          where: { id: config.id },
          data: {
            razorpayContactId: contact.id,
            razorpayFundAccountId: fundAccount.id,
          },
        })

        razorpaySuccess = true
      } catch (rpError: any) {
        const errMsg = rpError?.message || "Unknown error"

        // Provide specific error guidance
        if (errMsg.toLowerCase().includes("authentication")) {
          razorpayWarning = "Razorpay X authentication failed. " +
            "Your RAZORPAY_PAYOUT_KEY_ID or RAZORPAY_PAYOUT_KEY_SECRET " +
            "in .env.local are incorrect. Get Payout API keys from: " +
            "Razorpay X Dashboard → Settings → API Keys."
        } else if (errMsg.toLowerCase().includes("account")) {
          razorpayWarning = "Razorpay X account number error. " +
            "Verify RAZORPAY_X_ACCOUNT_NUMBER in .env.local matches " +
            "your Razorpay X current account number exactly."
        } else if (errMsg.toLowerCase().includes("ifsc")) {
          razorpayWarning = `Invalid IFSC code: ${data.ifscCode}. ` +
            "Please verify the IFSC code and try again."
        } else if (errMsg.toLowerCase().includes("contact")) {
          razorpayWarning = "Failed to create Razorpay contact. " +
            "Check that teacher email and phone are valid."
        } else {
          razorpayWarning = `Razorpay registration failed: ${errMsg}. ` +
            "Salary config is saved. You can retry from the salary page."
        }

        logger.error("Razorpay registration error:", rpError)
      }
    }

    await prisma.auditLog.create({
      data: {
        action: "SALARY_CONFIG_UPDATED",
        performedBy: session.user.id,
        targetId: data.teacherId,
        note: `Salary config set for ${teacher.employeeId}. ` +
          `Razorpay: ${razorpaySuccess ? "registered" : "failed"}`,
      },
    })

    return ApiResponse.success({
      razorpayRegistered: razorpaySuccess,
      warning: razorpayWarning,
    })
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
