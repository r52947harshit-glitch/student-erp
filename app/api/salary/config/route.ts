import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"
import { z } from "zod"
import { createRazorpayContact, createFundAccount } from "@/lib/razorpayPayout"

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
    } catch (rpError: any) {
      razorpayWarning =
        "Salary config saved but Razorpay registration failed: " +
        (rpError.message || "Unknown error") +
        ". You can retry from the salary page."
    }

    await prisma.auditLog.create({
      data: {
        action: "SALARY_CONFIG_UPDATED",
        performedBy: session.user.id,
        targetId: data.teacherId,
        note: `Salary config set for ${teacher.employeeId}: ₹${data.baseSalary}/month`,
      },
    })

    return NextResponse.json({
      success: true,
      warning: razorpayWarning,
    })
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
