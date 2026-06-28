import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"
import { noticeSchema } from "@/lib/validations"
import { handlePrismaError } from "@/lib/prisma-error"
import { notifyNoticePublished } from "@/lib/notificationService"
import logger from "@/lib/logger"

export async function GET(request: Request) {
  const { errorResponse } = await validateSession(["ADMIN", "TEACHER", "STUDENT"])
  if (errorResponse) return errorResponse
  
  // Example filter for future implementation: targetRole
  try {
    const notices = await prisma.notice.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(notices)
  } catch (error) {
    return handlePrismaError(error, "Failed to fetch notices")
  }
}

export async function POST(request: Request) {
  const { errorResponse, session } = await validateSession(["ADMIN"])
  if (errorResponse) return errorResponse

  try {
    const body = await request.json()
    const parseResult = noticeSchema.safeParse(body)
    
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.issues[0].message }, { status: 400 })
    }

    const { title, body: textBody, category, targetRole, scheduledAt } = parseResult.data

    const notice = await prisma.notice.create({
      data: {
        title,
        body: textBody,
        category,
        targetRole,
        postedBy: session.user.id,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      }
    })

    await prisma.auditLog.create({
       data: {
         action: "NOTICE_CREATED",
         performedBy: session.user.id,
         targetId: notice.id,
         note: `Posted a new Notice targeting ${targetRole}`
       }
    })

    // Notify users
    // If scheduledAt is in the future, we'd ideally use a cron, but for now we notify immediately or let a cron handle it.
    // The instructions say "Fire notifyNoticePublished on new notice."
    if (!scheduledAt || new Date(scheduledAt) <= new Date()) {
      let whereClause: any = { isActive: true }
      if (targetRole !== "ALL") {
        whereClause.role = targetRole
      }
      const users = await prisma.user.findMany({
        where: whereClause,
        select: { id: true }
      })
      const userIds = users.map(u => u.id)
      notifyNoticePublished(notice, userIds)
        .catch(e => logger.error("Notification failed:", e))
    }

    return NextResponse.json(notice)
  } catch (error) {
    return handlePrismaError(error, "Failed to create notice")
  }
}
