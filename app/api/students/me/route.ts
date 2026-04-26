import { NextResponse } from "next/server"
import { validateSession } from "@/lib/apiAuth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const { errorResponse, session } = await validateSession(["STUDENT"])
  if (errorResponse || !session) return errorResponse

  try {
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
      include: {
        user: { select: { name: true, email: true } }
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
      parentName: student.parentName,
      contact: student.contact,
      address: student.address,
      dob: student.dob,
      photoUrl: student.photoUrl,
      user: student.user
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Server error fetching profile" },
      { status: 500 }
    )
  }
}
