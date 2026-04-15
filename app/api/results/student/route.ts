import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"

export async function GET(request: Request) {
  const { errorResponse, session } = await validateSession(["STUDENT"])
  if (errorResponse) return errorResponse

  const { searchParams } = new URL(request.url)
  const examType = searchParams.get('exam')

  if (!examType) return NextResponse.json({ error: "Missing exam type" }, { status: 400 })

  try {
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
      include: {
        user: { select: { name: true } }
      }
    })

    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 })

    const results = await prisma.result.findMany({
      where: {
        studentId: student.id,
        examType: examType as any
      },
      orderBy: { subject: "asc" }
    })

    return NextResponse.json({
      student: {
        name: student.user.name,
        class: student.class,
        section: student.section,
        rollNo: student.rollNo
      },
      results
    })
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
