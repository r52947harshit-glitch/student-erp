import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { validateSession } from "@/lib/apiAuth"
import { studentSchema } from "@/lib/validations"
import { handlePrismaError } from "@/lib/prisma-error"
import { getCurrentAcademicYear, generateAdmissionNo, generateRollNo } from "@/lib/constants"

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
    const formData = await request.formData()

    const name         = formData.get("name") as string
    const className    = formData.get("class") as string
    const section      = formData.get("section") as string
    const dob          = formData.get("dob") as string
    const parentName   = formData.get("parentName") as string
    const contact      = formData.get("contact") as string
    const address      = formData.get("address") as string
    const photo        = formData.get("photo") as File | null

    // Validate required fields
    if (!name || !className || !section || !dob || !parentName || !contact || !address) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 })
    }

    // Validate contact
    if (!/^[6-9]\d{9}$/.test(contact)) {
      return NextResponse.json({ error: "Enter a valid 10-digit Indian mobile number." }, { status: 400 })
    }

    // Get current academic year
    let academicYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } })
    let yearStr = getCurrentAcademicYear()
    if (academicYear) {
      yearStr = academicYear.year
    } else {
      // Create one if none exists
      academicYear = await prisma.academicYear.create({
        data: {
          year: yearStr,
          startDate: new Date(),
          endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
          isCurrent: true
        }
      })
    }

    const countTotalThisYear = await prisma.student.count({
      where: { admissionYear: yearStr }
    })

    // Generate unique Admission Number
    let admissionSeq = countTotalThisYear + 1
    let admissionNo = generateAdmissionNo(yearStr, admissionSeq)
    while (true) {
      const existing = await prisma.student.findUnique({
        where: { admissionNo }
      })
      if (!existing) break
      admissionSeq++
      admissionNo = generateAdmissionNo(yearStr, admissionSeq)
    }

    const countInClassThisYear = await prisma.studentYear.count({
      where: { class: className, academicYearId: academicYear.id }
    })

    // Generate unique Roll Number: CLASS-YEAR-SEQUENCE & Email
    let rollSeq = countInClassThisYear + 1
    let rollNo = generateRollNo(className, yearStr, rollSeq)
    let email = `${rollNo.toLowerCase().replace(/[^a-z0-9]/g, '')}@school.com`
    while (true) {
      const existingRoll = await prisma.student.findUnique({
        where: { rollNo }
      })
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })
      if (!existingRoll && !existingUser) break
      rollSeq++
      rollNo = generateRollNo(className, yearStr, rollSeq)
      email = `${rollNo.toLowerCase().replace(/[^a-z0-9]/g, '')}@school.com`
    }

    const hashedPassword = await bcrypt.hash(contact, 10)

    // Handle photo upload BEFORE creating DB records
    let photoUrl: string | null = null
    if (photo && photo.size > 0) {
      const { uploadPhoto } = await import("@/lib/uploadHelper")
      const result = await uploadPhoto(
        photo,
        "student-photos",
        "students",
        rollNo.replace(/[^a-zA-Z0-9]/g, "-")
      )

      if (!result.success) {
        return NextResponse.json({ error: result.error || "Photo upload failed." }, { status: 400 })
      }

      photoUrl = result.photoUrl || null
    }

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

      const student = await tx.student.create({
        data: {
          userId: user.id,
          admissionYear: yearStr,
          admissionNo,
          class: className,
          section,
          rollNo,
          parentName,
          contact,
          address,
          photoUrl,
          dob: new Date(dob),
        },
        include: { user: { select: { email: true } } }
      })

      // Create StudentYear record
      if (academicYear) {
        await tx.studentYear.create({
          data: {
            studentId: student.id,
            academicYearId: academicYear.id,
            class: className,
            section,
            rollNo,
            status: "ACTIVE"
          }
        })
      }

      return student
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
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "A student with this roll number or email already exists." }, { status: 409 })
    }
    return handlePrismaError(error, "Failed to add student")
  }
}
