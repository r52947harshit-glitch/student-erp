import { validateSession } from "@/lib/apiAuth"
import { ApiResponse } from "@/lib/apiResponse"
import { prisma } from "@/lib/prisma"
import { getCurrentAcademicYear } from "@/lib/constants"
import logger from "@/lib/logger"

export async function POST(request: Request) {
  const { errorResponse, session } = await validateSession(["ADMIN"])
  if (errorResponse || !session) return errorResponse

  try {
    // Find all students whose admissionNo does NOT
    // match the STU-YYYY-XXX format
    const students = await prisma.student.findMany({
      where: {
        NOT: {
          admissionNo: {
            startsWith: "STU-",
          },
        },
      },
      select: {
        id: true,
        admissionYear: true,
        admissionNo: true,
        rollNo: true,
      },
      orderBy: { rollNo: "asc" },
    })

    if (students.length === 0) {
      return ApiResponse.success({
        message: "All students already have correct admission numbers.",
        fixed: 0,
      })
    }

    let fixedCount = 0

    for (const student of students) {
      // Derive year from admissionYear field or rollNo
      let yearStr = student.admissionYear || getCurrentAcademicYear()
      const yearPrefix = yearStr.split("-")[0]

      // Find existing STU-YYYY-XXX numbers for this year
      const existing = await prisma.student.findMany({
        where: {
          admissionNo: {
            startsWith: `STU-${yearPrefix}-`,
          },
        },
        select: { admissionNo: true },
        orderBy: { admissionNo: "desc" },
      })

      let seq = 1
      if (existing.length > 0) {
        const last = existing[0].admissionNo
        const parts = last.split("-")
        const lastSeq = parseInt(parts[parts.length - 1] || "0")
        if (!isNaN(lastSeq)) seq = lastSeq + 1
      }

      let newAdmissionNo = `STU-${yearPrefix}-${String(seq).padStart(3, "0")}`

      // Verify uniqueness
      let attempts = 0
      while (attempts < 50) {
        const exists = await prisma.student.findFirst({
          where: { admissionNo: newAdmissionNo },
          select: { id: true },
        })
        if (!exists) break
        seq++
        newAdmissionNo = `STU-${yearPrefix}-${String(seq).padStart(3, "0")}`
        attempts++
      }

      // Update the student
      await prisma.student.update({
        where: { id: student.id },
        data: {
          admissionNo: newAdmissionNo,
          admissionYear: yearStr,
        },
      })

      fixedCount++
    }

    return ApiResponse.success({
      message: `Fixed ${fixedCount} students with incorrect admission numbers.`,
      fixed: fixedCount,
    })
  } catch (error) {
    logger.error("Fix admission numbers error:", error)
    return ApiResponse.error("Failed to fix admission numbers.", 500)
  }
}
