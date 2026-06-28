import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"

export async function PATCH(request: Request) {
  const { errorResponse, session } = await validateSession(["STUDENT", "TEACHER"])
  if (errorResponse || !session) return errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const { notificationIds, markAllRead } = body

    if (markAllRead) {
      const { count } = await prisma.notification.updateMany({
        where: { userId: session.user.id, isRead: false },
        data: { isRead: true, readAt: new Date() }
      })
      return NextResponse.json({ success: true, updatedCount: count })
    }

    if (Array.isArray(notificationIds) && notificationIds.length > 0) {
      const { count } = await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: session.user.id,
          isRead: false
        },
        data: { isRead: true, readAt: new Date() }
      })
      return NextResponse.json({ success: true, updatedCount: count })
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 })
  }
}
