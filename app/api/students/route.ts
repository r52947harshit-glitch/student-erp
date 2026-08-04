import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { validateSession } from "@/lib/apiAuth"
import { getCurrentAcademicYear } from "@/lib/constants"
import { ApiResponse } from "@/lib/apiResponse"
import logger from "@/lib/logger"

export async function GET(request: Request) {
  const { errorResponse } = await validateSession(["ADMIN"])
  if (errorResponse) return errorResponse

  const { searchParams } = new URL(request.url)
  const checkIds = searchParams.get("checkIds")
  const classFilter = searchParams.get("class")
  const search = searchParams.get("search")

  try {
    if (checkIds === "true") {
      const countOld = await prisma.student.count({
        where: {
          NOT: {
            admissionNo: {
              startsWith: "STU-",
            },
          },
        },
      })
      return ApiResponse.success({
        hasOldAdmissionNumbers: countOld > 0,
      })
    }

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
    logger.error("Fetch students error:", error)
    return ApiResponse.error("Failed to fetch students", 500)
  }
}

export async function POST(request: Request) {
  const { errorResponse, session } = await validateSession(["ADMIN"])
  if (errorResponse || !session) return errorResponse

  try {
    const formData = await request.formData()

    const name       = (formData.get("name") as string)?.trim()
    const className  = (formData.get("class") as string)?.trim()
    const section    = (formData.get("section") as string)?.trim()
    const dob        = (formData.get("dob") as string)?.trim()
    const parentName = (formData.get("parentName") as string)?.trim()
    const contact    = (formData.get("contact") as string)?.trim()
    const address    = (formData.get("address") as string)?.trim()
    const photo      = formData.get("photo") as File | null

    // ── Validate required fields ──────────────────────────
    if (!name || !className || !section || !dob ||
        !parentName || !contact || !address) {
      return ApiResponse.error("All fields are required.", 400)
    }

    if (!/^[6-9]\d{9}$/.test(contact)) {
      return ApiResponse.error(
        "Enter a valid 10-digit Indian mobile number.", 400
      )
    }

    // ── Get or create current academic year ───────────────
    let academicYear = await prisma.academicYear.findFirst({
      where: { isCurrent: true },
    })

    let yearStr = getCurrentAcademicYear()

    if (academicYear) {
      yearStr = academicYear.year
    } else {
      // No year is marked isCurrent (e.g. after closing a year).
      // First try to find an existing year with the computed year string
      // before creating a new one — avoids unique constraint collision.
      academicYear = await prisma.academicYear.findFirst({
        where: { year: yearStr },
      })

      if (!academicYear) {
        // Truly no year exists at all — auto-create one
        const startYearNum = parseInt(yearStr.split("-")[0])
        academicYear = await prisma.academicYear.create({
          data: {
            year: yearStr,
            startDate: new Date(`${startYearNum}-04-01`),
            endDate: new Date(`${startYearNum + 1}-03-31`),
            isCurrent: true,
            isClosed: false,
          },
        })
      }
    }

    // ── Generate UNIQUE Admission Number ─────────────────
    // Strategy: find the highest existing admissionNo for
    // this year and increment. Never rely on count().
    const yearPrefix = yearStr.split("-")[0] // e.g. "2026"
    const admissionPattern = `STU-${yearPrefix}-`

    // Find all admission numbers for this year
    const existingAdmissions = await prisma.student.findMany({
      where: {
        admissionNo: {
          startsWith: admissionPattern,
        },
      },
      select: { admissionNo: true },
      orderBy: { admissionNo: "desc" },
    })

    // Extract max sequence number
    let admissionSeq = 1
    if (existingAdmissions.length > 0) {
      const lastAdmission = existingAdmissions[0].admissionNo
      // Format: STU-2026-001 → extract "001" → parse as 1
      const parts = lastAdmission.split("-")
      const lastSeq = parseInt(parts[parts.length - 1] || "0")
      if (!isNaN(lastSeq)) {
        admissionSeq = lastSeq + 1
      }
    }

    // Build admission number and verify uniqueness
    let admissionNo = `STU-${yearPrefix}-${String(admissionSeq).padStart(3, "0")}`
    
    // Double-check uniqueness (safety loop)
    let admissionAttempts = 0
    while (admissionAttempts < 100) {
      const exists = await prisma.student.findUnique({
        where: { admissionNo },
        select: { id: true },
      })
      if (!exists) break
      admissionSeq++
      admissionNo = `STU-${yearPrefix}-${String(admissionSeq).padStart(3, "0")}`
      admissionAttempts++
    }

    // ── Generate UNIQUE Roll Number ───────────────────────
    // Strategy: find highest rollNo for this class+year
    // by scanning actual Student records (not StudentYear)
    const rollPattern = `${className}-${yearPrefix}-`

    const existingRolls = await prisma.student.findMany({
      where: {
        rollNo: {
          startsWith: rollPattern,
        },
      },
      select: { rollNo: true },
      orderBy: { rollNo: "desc" },
    })

    let rollSeq = 1
    if (existingRolls.length > 0) {
      const lastRoll = existingRolls[0].rollNo
      const parts = lastRoll.split("-")
      const lastSeq = parseInt(parts[parts.length - 1] || "0")
      if (!isNaN(lastSeq)) {
        rollSeq = lastSeq + 1
      }
    }

    let rollNo = `${className}-${yearPrefix}-${String(rollSeq).padStart(3, "0")}`

    // Double-check rollNo uniqueness (safety loop)
    let rollAttempts = 0
    while (rollAttempts < 100) {
      const exists = await prisma.student.findUnique({
        where: { rollNo },
        select: { id: true },
      })
      if (!exists) break
      rollSeq++
      rollNo = `${className}-${yearPrefix}-${String(rollSeq).padStart(3, "0")}`
      rollAttempts++
    }

    // ── Generate UNIQUE Email ─────────────────────────────
    // Strategy: base email on admissionNo (already unique)
    // admissionNo "STU-2026-005" → "stu2026005@school.com"
    // This is ALWAYS unique because admissionNo is unique
    const emailBase = admissionNo
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") // removes "-" and spaces
    let email = `${emailBase}@school.com`
    // Result: "stu2026005@school.com" — guaranteed unique

    // Verify email uniqueness anyway (extra safety)
    const emailExists = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })
    if (emailExists) {
      // Fallback: add timestamp suffix
      email = `${emailBase}${Date.now()}@school.com`
    }

    // ── Handle Photo Upload ───────────────────────────────
    let photoUrl: string | null = null
    if (photo && photo.size > 0) {
      const { uploadPhoto } = await import("@/lib/uploadHelper")
      const result = await uploadPhoto(
        photo,
        "student-photos",
        "students",
        admissionNo.replace(/[^a-zA-Z0-9]/g, "-")
      )
      if (!result.success) {
        return ApiResponse.error(
          result.error || "Photo upload failed.", 400
        )
      }
      photoUrl = result.photoUrl || null
    }

    // ── Hash password ─────────────────────────────────────
    const hashedPassword = await bcrypt.hash(contact, 12)

    // ── Create User + Student in transaction ──────────────
    const newStudent = await prisma.$transaction(async (tx) => {
      // Create User
      const user = await tx.user.create({
        data: {
          name: name,
          email: email,
          password: hashedPassword,
          role: "STUDENT",
          isActive: true,
        },
      })

      // Create Student
      const student = await tx.student.create({
        data: {
          userId: user.id,
          admissionYear: yearStr,
          admissionNo: admissionNo,
          class: className,
          section: section.toUpperCase(),
          rollNo: rollNo,
          parentName: parentName,
          contact: contact,
          address: address,
          photoUrl: photoUrl,
          dob: new Date(dob),
        },
        include: {
          user: { select: { email: true } },
        },
      })

      // Create StudentYear record for academic year tracking
      await tx.studentYear.create({
        data: {
          studentId: student.id,
          academicYearId: academicYear!.id,
          class: className,
          section: section.toUpperCase(),
          rollNo: rollNo,
          status: "ACTIVE",
        },
      })

      // Audit log
      await tx.auditLog.create({
        data: {
          action: "STUDENT_CREATED",
          performedBy: session.user.id,
          targetId: student.id,
          note: `Created student ${rollNo} (${admissionNo})`,
        },
      })

      return student
    })

    return ApiResponse.success(
      {
        student: {
          id: newStudent.id,
          name: name,
          rollNo: rollNo,
          admissionNo: admissionNo,
          class: className,
          section: section,
          photoUrl: photoUrl,
        },
        // Show credentials to admin ONE TIME
        credentials: {
          email: email,
          tempPassword: contact,
          rollNo: rollNo,
          admissionNo: admissionNo,
        },
        // Also return for backward compat with frontend
        user: { email: email },
      },
      201
    )
  } catch (error: any) {
    // Log the actual error for debugging
    logger.error("Add student error:", error)

    // Specific Prisma unique constraint error
    if (error?.code === "P2002") {
      const field = error?.meta?.target?.[0] || "field"
      return ApiResponse.error(
        `Conflict on ${field}. Please try again — ` +
        `a unique ID will be generated automatically.`,
        409
      )
    }

    return ApiResponse.error(
      "Failed to add student. Please try again.", 500
    )
  }
}
