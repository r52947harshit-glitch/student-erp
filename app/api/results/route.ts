import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"

export async function GET(request: Request) {
  const { errorResponse, session } = await validateSession(["TEACHER", "ADMIN"])
  if (errorResponse || !session) return errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const className = searchParams.get('class')
  const subject = searchParams.get('subject')
  const examType = searchParams.get('examType')

  if (!className || !subject || !examType) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
  }

  if (session.user.role === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      include: { assignedClasses: true }
    })
    const isAssigned = teacher?.assignedClasses.some(ac => ac.className === className)
    if (!isAssigned) {
      return NextResponse.json({ error: "Unauthorized access to this class" }, { status: 403 })
    }
  }

  try {
    const results = await prisma.result.findMany({
      where: {
        subject,
        examType: examType as any,
        student: { class: className }
      }
    })

    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch results" }, { status: 500 })
  }
}
