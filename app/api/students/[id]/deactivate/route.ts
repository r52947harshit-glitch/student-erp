import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { errorResponse, session } = await validateSession(["ADMIN"])
  if (errorResponse || !session) return errorResponse

  try {
    const resolvedParams = await params
    const student = await prisma.student.findUnique({ where: { id: resolvedParams.id } })
    if (!student) return NextResponse.json({ error: "Not Found" }, { status: 404 })

    // Soft delete: set user.isActive = false
    await prisma.$transaction([
      prisma.user.update({
        where: { id: student.userId },
        data: { isActive: false }
      }),
      prisma.auditLog.create({
        data: {
          action: "STUDENT_DEACTIVATED",
          performedBy: session.user.id,
          targetId: student.id,
          note: `Deactivated student account and set isActive=false`
        }
      })
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to deactivate student" }, { status: 500 })
  }
}
