import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"
import { attendanceSchema } from "@/lib/validations"
import { handlePrismaError } from "@/lib/prisma-error"
import { startOfDay, endOfDay } from "date-fns"

export async function GET(request: Request) {
  const { errorResponse, session } = await validateSession(["TEACHER", "ADMIN"])
  if (errorResponse || !session) return errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const className = searchParams.get('class')
  const dateStr = searchParams.get('date')

  if (!className || !dateStr) return NextResponse.json({ error: "Missing parameters" }, { status: 400 })

  if (session.user.role === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      include: { classTeacher: true }
    })
    if (teacher?.classTeacher?.className !== className) {
      return NextResponse.json({ error: "Only the class teacher can view attendance for this class" }, { status: 403 })
    }
  }

  const targetDate = new Date(dateStr)
  const start = startOfDay(targetDate)
  const end = endOfDay(targetDate)

  try {
    // We check if there are any attendance records for the given class+date
    const records = await prisma.attendance.findMany({
      where: {
        date: { gte: start, lte: end },
        student: { class: className }
      },
      include: {
        student: { select: { rollNo: true, user: { select: { name: true } } } }
      }
    })

    return NextResponse.json({ isSubmitted: records.length > 0, records })
  } catch (error) {
    return handlePrismaError(error, "Failed to verify attendance status")
  }
}

export async function POST(request: Request) {
  const { errorResponse, session } = await validateSession(["TEACHER", "ADMIN"])
  if (errorResponse) return errorResponse

  try {
    const body = await request.json()
    const parseResult = attendanceSchema.safeParse(body)
    
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.issues[0].message }, { status: 400 })
    }
    
    const { date, attendanceList } = parseResult.data

    const payloadDate = new Date(date)

    if (session.user.role === "TEACHER") {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: session.user.id },
        include: { classTeacher: true }
      })
      
      // Verify first student's class to ensure teacher is assigned to it
      const sampleStudent = await prisma.student.findUnique({
        where: { id: attendanceList[0].studentId },
        select: { class: true }
      })
      
      if (!sampleStudent || teacher?.classTeacher?.className !== sampleStudent.class) {
        return NextResponse.json({ error: "Only the class teacher can mark attendance for this class." }, { status: 403 })
      }
    }

    // UPSERT all to gracefully handle dupes, though logic says "cannot resubmit"
    const results = await prisma.$transaction(
      attendanceList.map((record: any) => 
        prisma.attendance.upsert({
          where: {
            studentId_date: {
              studentId: record.studentId,
              date: payloadDate
            }
          },
          update: {
            status: record.status,
            markedBy: session.user.id
          },
          create: {
            studentId: record.studentId,
            date: payloadDate,
            status: record.status,
            markedBy: session.user.id
          }
        })
      )
    )

    return NextResponse.json({ success: true, count: results.length })
  } catch (error) {
    return handlePrismaError(error, "Failed to submit attendance")
  }
}
