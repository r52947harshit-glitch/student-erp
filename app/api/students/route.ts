import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { validateSession } from "@/lib/apiAuth"
import { studentSchema } from "@/lib/validations"
import { handlePrismaError } from "@/lib/prisma-error"

export async function GET(request: Request) {
  const { errorResponse } = await validateSession(["ADMIN"])
  if (errorResponse) return errorResponse

  const { searchParams } = new URL(request.url)
  const classFilter = searchParams.get("class")
  const search = searchParams.get("search")

  try {
    const students = await prisma.student.findMany({
      where: {
        user: { isActive: true },
        ...(classFilter && { class: classFilter }),
        ...(search && {
          OR: [
            { user: { name: { contains: search, mode: 'insensitive' } } },
            { rollNo: { contains: search, mode: 'insensitive' } }
          ]
        })
      },
      include: { user: { select: { name: true, email: true, isActive: true } } },
      orderBy: { class: 'asc' }
    })
    return NextResponse.json(students)
  } catch (error) {
    return handlePrismaError(error, "Failed to fetch students")
  }
}

export async function POST(request: Request) {
  const { errorResponse, session } = await validateSession(["ADMIN"])
  if (errorResponse) return errorResponse

  try {
    const body = await request.json()
    const parseResult = studentSchema.safeParse(body)
    
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.issues[0].message }, { status: 400 })
    }
    
    const { name, class: className, section, dob, parentName, contact, address, photoUrl } = parseResult.data

    // Generate Roll Number: CLASS-YEAR-SEQUENCE
    const year = new Date().getFullYear()
    const countInClassThisYear = await prisma.student.count({
      where: { class: className, rollNo: { contains: `${year}` } }
    })
    const sequence = String(countInClassThisYear + 1).padStart(3, '0')
    const rollNo = `${className}-${year}-${sequence}`
    
    // Auto-generate email & temp password (contact number base)
    const email = `${rollNo.toLowerCase()}@school.com`
    const hashedPassword = await bcrypt.hash(contact, 10)

    // Transaction to create User then Student
    const newStudent = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: "STUDENT",
        }
      })

      return await tx.student.create({
        data: {
          userId: user.id,
          class: className,
          section,
          rollNo,
          parentName,
          contact,
          address,
          photoUrl,
          dob: new Date(dob),
        },
        include: { user: { select: { email: true } } } // Return email for UI credentials display
      })
    })

    // Log the action asynchronously so we don't stall the request too much
    await prisma.auditLog.create({
      data: {
        action: "STUDENT_CREATED",
        performedBy: session.user.id,
        targetId: newStudent.id,
        note: `Created new student ${newStudent.rollNo}`
      }
    })

    return NextResponse.json(newStudent, { status: 201 })
  } catch (error: any) {
    return handlePrismaError(error, "Internal Server Error")
  }
}
