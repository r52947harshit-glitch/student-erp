import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"

export async function GET(request: Request) {
  const { errorResponse } = await validateSession(["TEACHER", "ADMIN"])
  if (errorResponse) return errorResponse

  const { searchParams } = new URL(request.url)
  const className = searchParams.get('class')

  if (!className) return NextResponse.json({ error: "Missing class parameter" }, { status: 400 })

  try {
    const students = await prisma.student.findMany({
      where: {
        class: className,
        user: { isActive: true } // Only fetch active students
      },
      select: {
        id: true,
        rollNo: true,
        user: { select: { name: true } }
      },
      orderBy: { rollNo: 'asc' }
    })

    return NextResponse.json(students)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 })
  }
}
