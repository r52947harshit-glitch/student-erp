import { NextResponse } from "next/server"
import { validateSession } from "@/lib/apiAuth"
import { prisma } from "@/lib/prisma"
import logger from "@/lib/logger"

export async function GET(request: Request) {
  const { errorResponse, session } = await validateSession(["STUDENT"])
  if (errorResponse || !session) return errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
      include: {
        user: { select: { name: true, email: true, isActive: true } }
      }
    })

    if (!student) {
      return NextResponse.json(
        { error: "Student profile not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: student.id,
      rollNo: student.rollNo,
      class: student.class,
      section: student.section,
      admissionNo: student.admissionNo ?? null,
      admissionYear: student.admissionYear ?? null,
      parentName: student.parentName,
      contact: student.contact,
      address: student.address,
      dob: student.dob,
      photoUrl: student.photoUrl ?? null,
      user: {
        name: student.user.name,
        email: student.user.email,
        isActive: student.user.isActive
      }
    })
  } catch (error) {
    logger.error("Student me error:", error)
    return NextResponse.json(
      { error: "Server error fetching profile" },
      { status: 500 }
    )
  }
}
