import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    if (year.isClosed) {
      return NextResponse.json({ error: "Academic year is already closed" }, { status: 400 })
    }

    if (!year.isCurrent) {
      return NextResponse.json({ error: "Can only close the current academic year" }, { status: 400 })
    }

    // Check if any students need promotion decisions before closing
    // Just a warning count, we don't block the close action here. 
    // They make decisions AFTER closing.
    const unpromotedCount = await prisma.studentYear.count({
      where: {
        academicYearId: yearId,
        status: "ACTIVE"
      }
    })

    const closedYear = await prisma.$transaction(async (tx) => {
      const updatedYear = await tx.academicYear.update({
        where: { id: yearId },
        data: {
          isClosed: true,
          isCurrent: false, // It's no longer the active year
          closedAt: new Date(),
          closedBy: session.user.id
        }
      })

      await tx.auditLog.create({
        data: {
          action: "ACADEMIC_YEAR_CLOSED",
          performedBy: session.user.id,
          targetId: yearId,
          note: `Closed academic year ${updatedYear.year}. ${unpromotedCount} students pending promotion.`
        }
      })

      return updatedYear
    })

    return NextResponse.json({ success: true, closedYear, unpromotedCount })
  } catch (error) {
    return NextResponse.json({ error: "Failed to close academic year" }, { status: 500 })
  }
}
