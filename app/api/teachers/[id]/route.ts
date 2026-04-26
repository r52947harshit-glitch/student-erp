import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/apiAuth";
import { updateTeacherSchema } from "@/lib/validations";
import { handlePrismaError } from "@/lib/prisma-error";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { errorResponse } = await validateSession(["ADMIN"]);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true, isActive: true } },
        assignedClasses: true,
      },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    return NextResponse.json(teacher);
  } catch (error) {
    return handlePrismaError(error, "Failed to fetch teacher");
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { errorResponse, session } = await validateSession(["ADMIN"]);
  if (errorResponse || !session)
    return errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();
    const parseResult = updateTeacherSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    const updatedTeacher = await prisma.$transaction(async (tx) => {
      if (data.name) {
        // Find teacher first to get userId
        const t = await tx.teacher.findUnique({ where: { id } });
        if (t) {
          await tx.user.update({
            where: { id: t.userId },
            data: { name: data.name },
          });
        }
      }

      const teacherData: any = {};
      if (data.phone) teacherData.phone = data.phone;
      if (data.address) teacherData.address = data.address;
      if (data.qualification) teacherData.qualification = data.qualification;

      if (data.assignedClasses) {
        // Delete all existing and recreate
        await tx.teacherClass.deleteMany({
          where: { teacherId: id },
        });

        teacherData.assignedClasses = {
          create: data.assignedClasses.map((ac) => ({
            className: ac.className,
            subjects: ac.subjects,
          })),
        };
      }

      const updated = await tx.teacher.update({
        where: { id },
        data: teacherData,
        include: {
          user: { select: { name: true, email: true, isActive: true } },
          assignedClasses: true,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "TEACHER_UPDATED",
          performedBy: session.user.id,
          targetId: id,
          note: `Updated teacher details for ${updated.employeeId}`,
        },
      });

      return updated;
    });

    return NextResponse.json(updatedTeacher);
  } catch (error) {
    return handlePrismaError(error, "Failed to update teacher");
  }
}
