import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"
import { CLASS_PROMOTION_MAP, generateRollNo } from "@/lib/constants"
import { notifyYearPromoted } from "@/lib/notificationService"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { errorResponse, session } = await validateSession(["ADMIN"])
  if (errorResponse || !session) return errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const oldYearId = id
    const { decisions, newAcademicYearId, confirmationToken } = await request.json()

    if (confirmationToken !== oldYearId) {
      return NextResponse.json({ error: "Invalid confirmation token. Promotion rejected." }, { status: 400 })
    }

    // Validation
    const oldYear = await prisma.academicYear.findUnique({ where: { id: oldYearId } })
    if (!oldYear) return NextResponse.json({ error: "Old academic year not found" }, { status: 404 })
    if (!oldYear.isClosed) return NextResponse.json({ error: "Academic year must be closed before promoting students" }, { status: 400 })

    const newYear = await prisma.academicYear.findUnique({ where: { id: newAcademicYearId } })
    if (!newYear) return NextResponse.json({ error: "New academic year not found" }, { status: 404 })

    let promoted = 0
    let detained = 0
    let graduated = 0
    let left = 0

    // Begin transaction
    await prisma.$transaction(async (tx) => {
      // Create a cache for class counts to generate roll numbers
      const rollNoSequence: Record<string, number> = {}

      for (const dec of decisions) {
        const { studentId, decision, newSection } = dec

        const currentStudentYear = await tx.studentYear.findUnique({
          where: {
            studentId_academicYearId: {
              studentId,
              academicYearId: oldYearId
            }
          },
          include: { student: { include: { user: true } } }
        })

        if (!currentStudentYear) continue;

        const currentClass = currentStudentYear.class
        const currentSection = currentStudentYear.section
        const targetSection = newSection || currentSection
        const studentUserId = currentStudentYear.student.userId

        if (decision === "PROMOTE") {
          const nextClass = CLASS_PROMOTION_MAP[currentClass]
          
          if (nextClass === null) {
            // Automatically graduated
            await tx.student.update({
              where: { id: studentId },
              data: { user: { update: { isActive: false } } }
            })
            await tx.studentYear.update({
              where: { id: currentStudentYear.id },
              data: { status: "PROMOTED", promotedAt: new Date(), promotedBy: session.user.id }
            })
            await notifyYearPromoted(studentUserId, currentClass, null, newYear.year)
            graduated++
          } else {
            // Promoted
            const classKey = `${nextClass}`
            if (!rollNoSequence[classKey]) {
              const count = await tx.student.count({ where: { class: nextClass } })
              rollNoSequence[classKey] = count
            }
            rollNoSequence[classKey]++
            
            const newRollNo = generateRollNo(nextClass, newYear.year, rollNoSequence[classKey])

            await tx.student.update({
              where: { id: studentId },
              data: { class: nextClass, section: targetSection, rollNo: newRollNo }
            })

            await tx.studentYear.create({
              data: {
                studentId,
                academicYearId: newAcademicYearId,
                class: nextClass,
                section: targetSection,
                rollNo: newRollNo,
                status: "ACTIVE"
              }
            })

            await tx.studentYear.update({
              where: { id: currentStudentYear.id },
              data: { status: "PROMOTED", promotedAt: new Date(), promotedBy: session.user.id }
            })

            await notifyYearPromoted(studentUserId, currentClass, nextClass, newYear.year)
            promoted++
          }
        } else if (decision === "DETAIN") {
          const classKey = `${currentClass}`
          if (!rollNoSequence[classKey]) {
            const count = await tx.student.count({ where: { class: currentClass } })
            rollNoSequence[classKey] = count
          }
          rollNoSequence[classKey]++
          
          const newRollNo = generateRollNo(currentClass, newYear.year, rollNoSequence[classKey])

          await tx.student.update({
            where: { id: studentId },
            data: { section: targetSection, rollNo: newRollNo }
          })

          await tx.studentYear.create({
            data: {
              studentId,
              academicYearId: newAcademicYearId,
              class: currentClass,
              section: targetSection,
              rollNo: newRollNo,
              status: "ACTIVE"
            }
          })

          await tx.studentYear.update({
            where: { id: currentStudentYear.id },
            data: { status: "DETAINED", promotedAt: new Date(), promotedBy: session.user.id }
          })
          detained++

        } else if (decision === "GRADUATED") {
          await tx.student.update({
            where: { id: studentId },
            data: { user: { update: { isActive: false } } }
          })
          await tx.studentYear.update({
            where: { id: currentStudentYear.id },
            data: { status: "PROMOTED", promotedAt: new Date(), promotedBy: session.user.id }
          })
          await notifyYearPromoted(studentUserId, currentClass, null, newYear.year)
          graduated++
        } else if (decision === "LEFT") {
          await tx.student.update({
            where: { id: studentId },
            data: { user: { update: { isActive: false } } }
          })
          await tx.studentYear.update({
            where: { id: currentStudentYear.id },
            data: { status: "LEFT", promotedAt: new Date(), promotedBy: session.user.id }
          })
          left++
        }
      }

      await tx.auditLog.create({
        data: {
          action: "STUDENTS_PROMOTED",
          performedBy: session.user.id,
          targetId: oldYearId,
          note: `Promoted: ${promoted}, Detained: ${detained}, Graduated: ${graduated}, Left: ${left}`
        }
      })
    }) // end transaction

    return NextResponse.json({
      success: true,
      promoted,
      detained,
      graduated,
      left,
      total: decisions.length
    })
  } catch (error) {
    console.error("Promotion Error:", error)
    return NextResponse.json({ error: "Failed to process promotion" }, { status: 500 })
  }
}
