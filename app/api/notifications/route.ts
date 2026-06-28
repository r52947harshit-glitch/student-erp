import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"

export async function GET(request: Request) {
  const { errorResponse, session } = await validateSession(["STUDENT", "TEACHER"])
  if (errorResponse || !session) return errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get("limit") || "20")
  const unreadOnly = searchParams.get("unreadOnly") === "true"

  try {
    const where: any = { userId: session.user.id }
    if (unreadOnly) {
      where.isRead = false
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        take: limit,
        orderBy: { createdAt: "desc" }
      }),
      prisma.notification.count({
        where: { userId: session.user.id, isRead: false }
      })
    ])

    return NextResponse.json({ data: { notifications, unreadCount } })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
  }
}
