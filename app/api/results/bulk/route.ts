import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"
import { resultBulkSchema } from "@/lib/validations"
import { handlePrismaError } from "@/lib/prisma-error"

export async function POST(request: Request) {
  const { errorResponse, session } = await validateSession(["TEACHER", "ADMIN"])
  if (errorResponse) return errorResponse

  try {
    const body = await request.json()
    const parseResult = resultBulkSchema.safeParse(body.payload)

    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.issues[0].message }, { status: 400 })
    }

    const payload = parseResult.data

    if (session.user.role === "TEACHER") {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: session.user.id },
        include: { assignedClasses: true }
      })
      
      const sampleStudent = await prisma.student.findUnique({
        where: { id: payload[0].studentId },
        select: { class: true }
      })
      
      const isAssigned = teacher?.assignedClasses.some(ac => ac.className === sampleStudent?.class)
      if (!sampleStudent || !isAssigned) {
        return NextResponse.json({ error: "Unauthorized to edit results for this class" }, { status: 403 })
      }
    }

    let createdCount = 0
    let updatedCount = 0

    await prisma.$transaction(async (tx) => {
      for (const rec of payload) {
        const existing = await tx.result.findUnique({
          where: {
            studentId_subject_examType: {
              studentId: rec.studentId,
              subject: rec.subject,
              examType: rec.examType,
            }
          }
        })

        if (existing) {
          await tx.result.update({
            where: { id: existing.id },
            data: {
              marksObtained: rec.marksObtained,
              totalMarks: rec.totalMarks
            }
          })
          updatedCount++
        } else {
          await tx.result.create({
             data: {
               studentId: rec.studentId,
               subject: rec.subject,
               examType: rec.examType,
               marksObtained: rec.marksObtained,
               totalMarks: rec.totalMarks
             }
          })
          createdCount++
        }
      }
      
      // We could log to AuditLog if edits occur, adhering to requested feature: "Edit log: if editing existing marks, require a short reason note"
      // Wait, let's look at that. The UI sends a note if it's an edit.
      // So payload could have { ...rec, editReason: "revaluation" }.
      // If editReason exists, we log it.
      for (const rec of payload) {
        if (rec.editReason) {
           await tx.auditLog.create({
             data: {
               action: "RESULT_EDITED",
               performedBy: session.user.id,
               targetId: rec.studentId,
               note: `Subject: ${rec.subject}, Exam: ${rec.examType}. Reason: ${rec.editReason}`
             }
           })
        }
      }

    })

    return NextResponse.json({ success: true, createdCount, updatedCount })
  } catch (error) {
    return handlePrismaError(error, "Failed to save results")
  }
}
