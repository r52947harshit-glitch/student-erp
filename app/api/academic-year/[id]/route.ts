import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"

/**
 * ⚠️ DEV-ONLY: Delete an academic year and all its StudentYear records.
 * This route is blocked in production (NODE_ENV !== "development").
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Hard block in production
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "This endpoint is only available in development mode." },
      { status: 403 }
    )
  }

  const { errorResponse } = await validateSession(["ADMIN"])
  if (errorResponse) return errorResponse

  try {
    const { id } = await params

    const year = await prisma.academicYear.findUnique({ where: { id } })
    if (!year) {
      return NextResponse.json({ error: "Academic year not found." }, { status: 404 })
    }

    // Delete in correct dependency order inside a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Remove all StudentYear enrollments for this year
      await tx.studentYear.deleteMany({ where: { academicYearId: id } })

      // 2. Delete the academic year itself
      await tx.academicYear.delete({ where: { id } })
    })

    return NextResponse.json({
      success: true,
      message: `Academic year "${year.year}" and its enrollments have been deleted.`,
    })
  } catch (error) {
    console.error("Dev delete academic year error:", error)
    return NextResponse.json(
      { error: "Failed to delete academic year." },
      { status: 500 }
    )
  }
}
