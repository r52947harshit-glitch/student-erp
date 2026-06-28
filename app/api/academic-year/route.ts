import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"
import logger from "@/lib/logger"

export async function GET(request: Request) {
  const { errorResponse } = await validateSession(["ADMIN"])
  if (errorResponse) return errorResponse

  try {
    const years = await prisma.academicYear.findMany({
      orderBy: { year: "desc" },
      include: {
        _count: {
          select: { students: true }
        }
      }
    })

    return NextResponse.json({ success: true, data: { years: years ?? [] } })
  } catch (error) {
    logger.error("Get academic years error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch academic years." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { errorResponse, session } = await validateSession(["ADMIN"])
  if (errorResponse || !session) return errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    // Parse body safely
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 })
    }

    const { year, startDate, endDate } = body

    // Validate all fields present
    if (!year || !startDate || !endDate) {
      return NextResponse.json({ success: false, error: "Year, start date and end date are required." }, { status: 400 })
    }

    // Validate year format: YYYY-YY
    const yearRegex = /^\d{4}-\d{2}$/
    if (!yearRegex.test(year)) {
      return NextResponse.json({ success: false, error: "Year must be in format YYYY-YY (e.g. 2024-25)." }, { status: 400 })
    }

    // Validate dates
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ success: false, error: "Invalid date format." }, { status: 400 })
    }

    if (end <= start) {
      return NextResponse.json({ success: false, error: "End date must be after start date." }, { status: 400 })
    }

    // Check if year already exists
    const existing = await prisma.academicYear.findUnique({
      where: { year },
    })
    if (existing) {
      return NextResponse.json({ success: false, error: `Academic year ${year} already exists.` }, { status: 409 })
    }

    // Create the academic year
    const newYear = await prisma.academicYear.create({
      data: {
        year,
        startDate: start,
        endDate: end,
        isCurrent: false,
        isClosed: false,
      },
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: "ACADEMIC_YEAR_CREATED",
        performedBy: session.user.id,
        targetId: newYear.id,
        note: `Created academic year ${year}`,
      },
    })

    return NextResponse.json({ success: true, data: { year: newYear } }, { status: 201 })
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ success: false, error: "This academic year already exists." }, { status: 409 })
    }
    logger.error("Create academic year error:", error)
    return NextResponse.json({ success: false, error: "Failed to create academic year." }, { status: 500 })
  }
}
