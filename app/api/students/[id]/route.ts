import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"
import { studentSchema } from "@/lib/validations"
import { handlePrismaError } from "@/lib/prisma-error"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { errorResponse } = await validateSession(["ADMIN"])
  if (errorResponse) return errorResponse

  try {
    const resolvedParams = await params
    const body = await request.json()
    const parseResult = studentSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.issues[0].message }, { status: 400 })
    }

    const { name, class: className, section, dob, parentName, contact, address, photoUrl } = parseResult.data

    const student = await prisma.student.update({
      where: { id: resolvedParams.id },
      data: {
        class: className,
        section,
        parentName,
        contact,
        address,
        ...(photoUrl && { photoUrl }),
        ...(dob && { dob: new Date(dob) }),
        user: {
          update: { name }
        }
      },
      include: { user: { select: { name: true } } }
    })

    const { session } = await validateSession(["ADMIN"])
    if (session) {
      await prisma.auditLog.create({
        data: {
          action: "STUDENT_UPDATED",
          performedBy: session.user.id,
          targetId: student.id,
          note: `Updated student details for ${student.rollNo}`
        }
      })
    }

    return NextResponse.json(student)
  } catch (error) {
    return handlePrismaError(error, "Failed to update student")
  }
}
