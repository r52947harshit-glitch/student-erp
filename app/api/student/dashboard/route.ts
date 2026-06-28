import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"

export async function GET() {
  const { errorResponse, session } = await validateSession(["STUDENT"])
  if (errorResponse) return errorResponse

  try {
    // Run student profile query, current academic year query, and total notices count query in parallel
    const [student, currentYear, totalNotices] = await Promise.all([
      prisma.student.findUnique({
        where: { userId: session!.user.id },
        include: {
          user: { select: { name: true, email: true } },
          attendance: true,
          payments: { where: { status: "PENDING" } },
          results: {
             orderBy: { createdAt: 'desc' }
          }
        }
      }),
      prisma.academicYear.findFirst({
        where: { isCurrent: true }
      }),
      prisma.notice.count({
        where: { targetRole: { in: ["ALL", "STUDENT"] } }
      })
    ])

    if (!student) return NextResponse.json({ error: "Student profile not linked properly" }, { status: 404 })

    // Attendance %
    let attendancePercentage = 100
    if (student.attendance.length > 0) {
      const presentDays = student.attendance.filter(a => a.status === "PRESENT").length
      attendancePercentage = (presentDays / student.attendance.length) * 100
    }

    // Fee Status
    const hasPendingFees = student.payments.length > 0

    // Latest Result Logic
    let lastResultPercentage = null
    if (student.results.length > 0) {
      // Group by latest examType
      const latestExamType = student.results[0].examType
      const relatedResults = student.results.filter(r => r.examType === latestExamType)
      
      let sumObs = 0
      let sumTot = 0
      relatedResults.forEach(r => {
        sumObs += r.marksObtained
        sumTot += r.totalMarks
      })

      if (sumTot > 0) {
        lastResultPercentage = (sumObs / sumTot) * 100
      }
    }

    // Assignments Due Soon
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
    const now = new Date()

    const assignmentsDueSoon = await prisma.assignment.count({
      where: {
        className: student.class,
        dueDate: {
          gte: now,
          lte: threeDaysFromNow
        },
        submissions: {
          none: {
            studentId: student.id
          }
        }
      }
    })

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.user.name,
        class: student.class,
        section: student.section,
        rollNo: student.rollNo,
        admissionNo: student.admissionNo,
        admissionYear: student.admissionYear,
        photoUrl: student.photoUrl,
        email: student.user.email
      },
      currentAcademicYear: currentYear?.year || "N/A",
      metrics: {
        attendancePercentage: attendancePercentage.toFixed(1),
        hasPendingFees,
        lastResultPercentage: lastResultPercentage ? lastResultPercentage.toFixed(1) : null,
        totalNotices,
        assignmentsDueSoon
      }
    })
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
