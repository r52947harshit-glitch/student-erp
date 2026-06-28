import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { errorResponse, session } = await validateSession(["ADMIN"])
  if (errorResponse || !session) return errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const yearId = id

    const year = await prisma.academicYear.findUnique({
      where: { id: yearId }
    })

    if (!year) {
      return NextResponse.json({ error: "Academic year not found" }, { status: 404 })
    }

    const updatedYear = await prisma.$transaction(async (tx) => {
      // Unset all others
      await tx.academicYear.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false }
      })

      // Set this one as current
      const newCurrent = await tx.academicYear.update({
        where: { id: yearId },
        data: { isCurrent: true }
      })

      await tx.auditLog.create({
        data: {
          action: "ACADEMIC_YEAR_SET_CURRENT",
          performedBy: session.user.id,
          targetId: yearId,
          note: `Set ${newCurrent.year} as current academic year`
        }
      })

      return newCurrent
    })

    return NextResponse.json(updatedYear)
  } catch (error) {
    return NextResponse.json({ error: "Failed to set current academic year" }, { status: 500 })
  }
}
