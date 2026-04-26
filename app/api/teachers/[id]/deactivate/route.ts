import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/apiAuth";
import { handlePrismaError } from "@/lib/prisma-error";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { errorResponse, session } = await validateSession(["ADMIN"]);
  if (errorResponse || !session)
    return errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const teacher = await prisma.teacher.findUnique({
      where: { id },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.teacher.update({
        where: { id },
        data: { user: { update: { isActive: false } } },
        include: { user: { select: { name: true, email: true, isActive: true } } }
      });

      await tx.auditLog.create({
        data: {
          action: "TEACHER_DEACTIVATED",
          performedBy: session.user.id,
          targetId: id,
          note: `Deactivated teacher ${teacher.employeeId}`,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handlePrismaError(error, "Failed to deactivate teacher");
  }
}
