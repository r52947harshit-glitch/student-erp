import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/apiAuth";
import { addTeacherSchema } from "@/lib/validations";
import { handlePrismaError } from "@/lib/prisma-error";
import bcrypt from "bcryptjs";

export async function GET(request: Request) {
  const { errorResponse } = await validateSession(["ADMIN"]);
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  try {
    const whereClause: any = search
      ? {
          OR: [
            { user: { name: { contains: search, mode: "insensitive" } } },
            { employeeId: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const [teachers, total] = await Promise.all([
      prisma.teacher.findMany({
        where: whereClause,
        include: {
          user: { select: { name: true, email: true, isActive: true } },
          assignedClasses: true,
        },
        skip,
        take: limit,
        orderBy: { joiningDate: "desc" },
      }),
      prisma.teacher.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      teachers,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return handlePrismaError(error, "Failed to fetch teachers");
  }
}

export async function POST(request: Request) {
  const { errorResponse, session } = await validateSession(["ADMIN"]);
  if (errorResponse || !session)
    return errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parseResult = addTeacherSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // Check if email is used
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) {
      return NextResponse.json({ error: "Email is already in use" }, { status: 400 });
    }

    // Generate employeeId
    const currentYear = new Date().getFullYear();
    const teacherCount = await prisma.teacher.count();
    const sequence = (teacherCount + 1).toString().padStart(3, "0");
    const employeeId = `TCH-${currentYear}-${sequence}`;

    const hashedPassword = await bcrypt.hash(data.phone, 10);

    const teacher = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: data.email,
          name: data.name,
          password: hashedPassword,
          role: "TEACHER",
          isActive: true,
        },
      });

      const newTeacher = await tx.teacher.create({
        data: {
          userId: newUser.id,
          employeeId,
          phone: data.phone,
          address: data.address,
          qualification: data.qualification,
          joiningDate: new Date(data.joiningDate),
          assignedClasses: {
            create: data.assignedClasses.map((ac) => ({
              className: ac.className,
              subjects: ac.subjects,
            })),
          },
        },
        include: {
          user: { select: { name: true, email: true } },
          assignedClasses: true,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "TEACHER_ADDED",
          performedBy: session.user.id,
          targetId: newTeacher.id,
          note: `Created teacher ${employeeId}`,
        },
      });

      return newTeacher;
    });

    return NextResponse.json(
      { teacher, credentials: { email: data.email, tempPassword: data.phone } },
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.code === "P2002") {
      const field = error?.meta?.target?.[0] || "field"
      return NextResponse.json(
        { error: `A teacher with this ${field} already exists.` },
        { status: 409 }
      )
    }
    return handlePrismaError(error, "Failed to create teacher")
  }
}
