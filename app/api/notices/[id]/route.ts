import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"
import { noticeSchema } from "@/lib/validations"
import { handlePrismaError } from "@/lib/prisma-error"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { errorResponse } = await validateSession(["ADMIN"])
  if (errorResponse) return errorResponse

  try {
    const resolvedParams = await params
    const body = await request.json()
    const parseResult = noticeSchema.safeParse(body)
    
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.issues[0].message }, { status: 400 })
    }

    const { title, body: textBody, category, targetRole, scheduledAt } = parseResult.data

    const notice = await prisma.notice.update({
      where: { id: resolvedParams.id },
      data: {
        title,
        body: textBody,
        category,
        targetRole,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      }
    })

    const { session } = await validateSession(["ADMIN"])
    if (session) {
      await prisma.auditLog.create({
         data: {
           action: "NOTICE_UPDATED",
           performedBy: session.user.id,
           targetId: notice.id,
           note: `Updated Notice: ${title}`
         }
      })
    }

    return NextResponse.json(notice)
  } catch (error) {
    return handlePrismaError(error, "Failed to update notice")
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { errorResponse } = await validateSession(["ADMIN"])
  if (errorResponse) return errorResponse

  try {
    const resolvedParams = await params
    await prisma.notice.delete({ where: { id: resolvedParams.id } })

    const { session } = await validateSession(["ADMIN"])
    if (session) {
      await prisma.auditLog.create({
         data: {
           action: "NOTICE_DELETED",
           performedBy: session.user.id,
           targetId: resolvedParams.id,
           note: `Notice completely deleted`
         }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handlePrismaError(error, "Failed to delete notice")
  }
}
