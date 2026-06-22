import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"
import bcrypt from "bcryptjs"
import logger from "@/lib/logger"

export async function PATCH(request: Request) {
  const { errorResponse, session } = await validateSession(["TEACHER"])
  if (errorResponse || !session) return errorResponse

  try {
    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current and new passwords are required" }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters long" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password)
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Incorrect current password" }, { status: 401 })
    }

    // Check if new password is the same as the old one
    const isSamePassword = await bcrypt.compare(newPassword, user.password)
    if (isSamePassword) {
      return NextResponse.json({ error: "New password cannot be the same as the current password" }, { status: 400 })
    }

    // Hash and update
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword }
    })

    await prisma.auditLog.create({
      data: {
        action: "PASSWORD_CHANGED",
        performedBy: session.user.id,
        targetId: session.user.id,
        note: "Teacher updated their password",
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("Failed to update password:", error)
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 })
  }
}
