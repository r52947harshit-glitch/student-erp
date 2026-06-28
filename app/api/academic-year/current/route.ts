import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"

export async function GET(request: Request) {
  // Allow any authenticated user (Admin, Teacher, Student)
  const { errorResponse } = await validateSession(["ADMIN", "TEACHER", "STUDENT"])
  if (errorResponse) return errorResponse

  try {
    const currentYear = await prisma.academicYear.findFirst({
      where: { isCurrent: true }
    })
    
    return NextResponse.json(currentYear)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch current academic year" }, { status: 500 })
  }
}
