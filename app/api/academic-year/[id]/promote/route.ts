import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"
import { CLASS_PROMOTION_MAP, generateRollNo } from "@/lib/constants"
import { notifyYearPromoted } from "@/lib/notificationService"
import logger from "@/lib/logger"

/**
 * Extract the max sequence number for a given roll prefix from the DB.
 * e.g. prefix "2-2026-" → scans existing rolls → returns highest seq found.
 * Used BEFORE the transaction to seed the in-memory counters.
 */
async function getMaxRollSeq(
  className: string,
  newYearStr: string
): Promise<number> {
  const yearPrefix = newYearStr.split("-")[0]
  const rollPattern = `${className}-${yearPrefix}-`

  const existing = await prisma.student.findMany({
    where: { rollNo: { startsWith: rollPattern } },
    select: { rollNo: true },
    orderBy: { rollNo: "desc" },
  })

  if (existing.length === 0) return 0

  const lastRoll = existing[0].rollNo
  const parts = lastRoll.split("-")
  const lastSeq = parseInt(parts[parts.length - 1] || "0")
  return isNaN(lastSeq) ? 0 : lastSeq
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse } = await validateSession(["ADMIN"])
  if (errorResponse) return errorResponse

  try {
    const { id } = await params

    // Return all students enrolled in this academic year (for the promote dialog)
    const studentYears = await prisma.studentYear.findMany({
      where: { academicYearId: id, status: "ACTIVE" },
      include: {
        student: {
          include: { user: { select: { name: true, email: true } } },
        },
      },
      orderBy: [{ class: "asc" }, { rollNo: "asc" }],
    })

    return NextResponse.json({ success: true, data: studentYears })
  } catch (error) {
    logger.error("Fetch promotion students error:", error)
    return NextResponse.json(
      { error: "Failed to fetch students for promotion" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse, session } = await validateSession(["ADMIN"])
  if (errorResponse || !session)
    return (
      errorResponse ||
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    )

  try {
    const { id } = await params
    const oldYearId = id
    const { decisions, newAcademicYearId, confirmationToken } =
      await request.json()

    if (confirmationToken !== oldYearId) {
      return NextResponse.json(
        { error: "Invalid confirmation token. Promotion rejected." },
        { status: 400 }
      )
    }

    if (!decisions || decisions.length === 0) {
      return NextResponse.json(
        { error: "No promotion decisions provided." },
        { status: 400 }
      )
    }

    // ── Validation ──────────────────────────────────────────
    const oldYear = await prisma.academicYear.findUnique({
      where: { id: oldYearId },
    })
    if (!oldYear)
      return NextResponse.json(
        { error: "Old academic year not found" },
        { status: 404 }
      )
    if (!oldYear.isClosed)
      return NextResponse.json(
        {
          error:
            "Academic year must be closed before promoting students",
        },
        { status: 400 }
      )

    const newYear = await prisma.academicYear.findUnique({
      where: { id: newAcademicYearId },
    })
    if (!newYear)
      return NextResponse.json(
        { error: "New academic year not found" },
        { status: 404 }
      )

    // ── Pre-seed roll number sequences BEFORE transaction ───
    // Find all distinct target classes we'll need sequences for
    const classesNeeded = new Set<string>()
    for (const dec of decisions) {
      if (dec.decision === "PROMOTE") {
        const currentYear = await prisma.studentYear.findUnique({
          where: {
            studentId_academicYearId: {
              studentId: dec.studentId,
              academicYearId: oldYearId,
            },
          },
          select: { class: true },
        })
        if (currentYear) {
          const nextClass = CLASS_PROMOTION_MAP[currentYear.class]
          if (nextClass !== null && nextClass !== undefined) {
            classesNeeded.add(nextClass)
          }
        }
      } else if (dec.decision === "DETAIN") {
        const currentYear = await prisma.studentYear.findUnique({
          where: {
            studentId_academicYearId: {
              studentId: dec.studentId,
              academicYearId: oldYearId,
            },
          },
          select: { class: true },
        })
        if (currentYear) {
          classesNeeded.add(currentYear.class)
        }
      }
    }

    // Seed roll number counter from actual DB max (outside transaction)
    const rollNoSequence: Record<string, number> = {}
    for (const cls of classesNeeded) {
      rollNoSequence[cls] = await getMaxRollSeq(cls, newYear.year)
    }

    let promoted = 0
    let detained = 0
    let graduated = 0
    let left = 0

    // ── Transaction ──────────────────────────────────────────
    await prisma.$transaction(async (tx) => {
      for (const dec of decisions) {
        const { studentId, decision, newSection } = dec

        const currentStudentYear = await tx.studentYear.findUnique({
          where: {
            studentId_academicYearId: {
              studentId,
              academicYearId: oldYearId,
            },
          },
          include: { student: { include: { user: true } } },
        })

        if (!currentStudentYear) continue

        const currentClass = currentStudentYear.class
        const currentSection = currentStudentYear.section
        const targetSection = newSection || currentSection
        const studentUserId = currentStudentYear.student.userId

        if (decision === "PROMOTE") {
          const nextClass = CLASS_PROMOTION_MAP[currentClass]

          if (nextClass === null || nextClass === undefined) {
            // Class 8 → automatically graduated
            await tx.student.update({
              where: { id: studentId },
              data: { user: { update: { isActive: false } } },
            })
            await tx.studentYear.update({
              where: { id: currentStudentYear.id },
              data: {
                status: "PROMOTED",
                promotedAt: new Date(),
                promotedBy: session.user.id,
              },
            })
            await notifyYearPromoted(
              studentUserId,
              currentClass,
              null,
              newYear.year
            )
            graduated++
          } else {
            // Increment in-memory counter (seeded from DB max above)
            if (rollNoSequence[nextClass] === undefined) {
              rollNoSequence[nextClass] = 0
            }
            rollNoSequence[nextClass]++

            const newRollNo = generateRollNo(
              nextClass,
              newYear.year,
              rollNoSequence[nextClass]
            )

            await tx.student.update({
              where: { id: studentId },
              data: {
                class: nextClass,
                section: targetSection,
                rollNo: newRollNo,
              },
            })

            await tx.studentYear.create({
              data: {
                studentId,
                academicYearId: newAcademicYearId,
                class: nextClass,
                section: targetSection,
                rollNo: newRollNo,
                status: "ACTIVE",
              },
            })

            await tx.studentYear.update({
              where: { id: currentStudentYear.id },
              data: {
                status: "PROMOTED",
                promotedAt: new Date(),
                promotedBy: session.user.id,
              },
            })

            await notifyYearPromoted(
              studentUserId,
              currentClass,
              nextClass,
              newYear.year
            )
            promoted++
          }
        } else if (decision === "DETAIN") {
          if (rollNoSequence[currentClass] === undefined) {
            rollNoSequence[currentClass] = 0
          }
          rollNoSequence[currentClass]++

          const newRollNo = generateRollNo(
            currentClass,
            newYear.year,
            rollNoSequence[currentClass]
          )

          await tx.student.update({
            where: { id: studentId },
            data: { section: targetSection, rollNo: newRollNo },
          })

          await tx.studentYear.create({
            data: {
              studentId,
              academicYearId: newAcademicYearId,
              class: currentClass,
              section: targetSection,
              rollNo: newRollNo,
              status: "ACTIVE",
            },
          })

          await tx.studentYear.update({
            where: { id: currentStudentYear.id },
            data: {
              status: "DETAINED",
              promotedAt: new Date(),
              promotedBy: session.user.id,
            },
          })
          detained++
        } else if (decision === "GRADUATED") {
          await tx.student.update({
            where: { id: studentId },
            data: { user: { update: { isActive: false } } },
          })
          await tx.studentYear.update({
            where: { id: currentStudentYear.id },
            data: {
              status: "PROMOTED",
              promotedAt: new Date(),
              promotedBy: session.user.id,
            },
          })
          await notifyYearPromoted(
            studentUserId,
            currentClass,
            null,
            newYear.year
          )
          graduated++
        } else if (decision === "LEFT") {
          await tx.student.update({
            where: { id: studentId },
            data: { user: { update: { isActive: false } } },
          })
          await tx.studentYear.update({
            where: { id: currentStudentYear.id },
            data: {
              status: "LEFT",
              promotedAt: new Date(),
              promotedBy: session.user.id,
            },
          })
          left++
        }
      }

      await tx.auditLog.create({
        data: {
          action: "STUDENTS_PROMOTED",
          performedBy: session.user.id,
          targetId: oldYearId,
          note: `Promoted: ${promoted}, Detained: ${detained}, Graduated: ${graduated}, Left: ${left}`,
        },
      })
    }) // end transaction

    return NextResponse.json({
      success: true,
      promoted,
      detained,
      graduated,
      left,
      total: decisions.length,
    })
  } catch (error: any) {
    logger.error("Promotion Error:", error)

    if (error?.code === "P2002") {
      const field = error?.meta?.target?.[0] || "field"
      return NextResponse.json(
        {
          error: `Unique conflict on ${field} during promotion. Please retry — IDs are auto-generated.`,
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Failed to process promotion. Please try again." },
      { status: 500 }
    )
  }
}
