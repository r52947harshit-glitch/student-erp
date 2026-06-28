import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/apiAuth";
import { teacherSelfUpdateSchema } from "@/lib/validations";
import { handlePrismaError } from "@/lib/prisma-error";
import logger from "@/lib/logger";

export async function GET(request: Request) {
  const { errorResponse, session } = await validateSession(["TEACHER"]);
  if (errorResponse || !session)
    return errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      include: {
        user: { select: { name: true, email: true, isActive: true } },
        assignedClasses: {
          select: {
            id: true,
            className: true,
            subjects: true,
          }
        },
        classTeacher: {
          select: {
            className: true,
          }
        },
      },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: teacher.id,
      employeeId: teacher.employeeId,
      phone: teacher.phone,
      address: teacher.address,
      qualification: teacher.qualification,
      joiningDate: teacher.joiningDate,
      photoUrl: teacher.photoUrl ?? null,
      user: {
        name: teacher.user.name,
        email: teacher.user.email,
        isActive: teacher.user.isActive,
      },
      assignedClasses: teacher.assignedClasses ?? [],
      isClassTeacher: !!teacher.classTeacher,
      classTeacherOf: teacher.classTeacher?.className ?? null,
    });
  } catch (error) {
    logger.error("Teacher me error:", error);
    return handlePrismaError(error, "Failed to fetch teacher profile");
  }
}

export async function PATCH(request: Request) {
  const { errorResponse, session } = await validateSession(["TEACHER"]);
  if (errorResponse || !session)
    return errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parseResult = teacherSelfUpdateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    const updatedTeacher = await prisma.$transaction(async (tx) => {
      const updated = await tx.teacher.update({
        where: { id: teacher.id },
        data,
        include: {
          user: { select: { name: true, email: true, isActive: true } },
          assignedClasses: {
            select: {
              id: true,
              className: true,
              subjects: true,
            }
          },
          classTeacher: {
            select: {
              className: true,
            }
          },
        },
      });

      await tx.auditLog.create({
        data: {
          action: "TEACHER_SELF_UPDATE",
          performedBy: session.user.id,
          targetId: teacher.id,
          note: `Teacher ${teacher.employeeId} updated their profile`,
        },
      });

      // Return in same format as GET
      return {
        id: updated.id,
        employeeId: updated.employeeId,
        phone: updated.phone,
        address: updated.address,
        qualification: updated.qualification,
        joiningDate: updated.joiningDate,
        photoUrl: updated.photoUrl ?? null,
        user: {
          name: updated.user.name,
          email: updated.user.email,
          isActive: updated.user.isActive,
        },
        assignedClasses: updated.assignedClasses ?? [],
        isClassTeacher: !!updated.classTeacher,
        classTeacherOf: updated.classTeacher?.className ?? null,
      };
    });

    return NextResponse.json(updatedTeacher);
  } catch (error) {
    return handlePrismaError(error, "Failed to update profile");
  }
}
