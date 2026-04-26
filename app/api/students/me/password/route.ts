import { NextResponse } from "next/server"
import { validateSession } from "@/lib/apiAuth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

export async function PATCH(request: Request) {
  const { errorResponse, session } = await validateSession(["STUDENT"])
  if (errorResponse || !session) return errorResponse

  try {
    const body = await request.json()
    const parseResult = passwordSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { currentPassword, newPassword } = parseResult.data

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "New password cannot be same as current password" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const isValid = await bcrypt.compare(currentPassword, user.password)
    if (!isValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      )
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      })

      await tx.auditLog.create({
        data: {
          action: "STUDENT_PASSWORD_CHANGED",
          performedBy: user.id,
          targetId: user.id,
          note: "Student changed their password securely"
        }
      })
    })

    return NextResponse.json({ success: true, message: "Password changed successfully" })

  } catch (error) {
    return NextResponse.json(
      { error: "Server error changing password" },
      { status: 500 }
    )
  }
}
