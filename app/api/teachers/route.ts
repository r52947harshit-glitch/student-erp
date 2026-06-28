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
    const formData = await request.formData()

    const name          = formData.get("name") as string
    const email         = formData.get("email") as string
    const phone         = formData.get("phone") as string
    const address       = formData.get("address") as string
    const qualification = formData.get("qualification") as string
    const joiningDate   = formData.get("joiningDate") as string
    const photo         = formData.get("photo") as File | null

    const assignedClassesRaw = formData.get("assignedClasses") as string
    let assignedClasses: { className: string; subjects: string[] }[] = []
    try {
      assignedClasses = JSON.parse(assignedClassesRaw || "[]")
    } catch {
      return NextResponse.json({ error: "Invalid assigned classes format." }, { status: 400 })
    }

    if (!name || !email || !phone || !address || !qualification || !joiningDate) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 })
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return NextResponse.json({ error: "Enter a valid 10-digit Indian mobile number." }, { status: 400 })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 })
    }

    if (!assignedClasses.length) {
      return NextResponse.json({ error: "Assign at least one class to the teacher." }, { status: 400 })
    }

    for (const ac of assignedClasses) {
      if (!ac.subjects?.length) {
        return NextResponse.json({ error: `Select at least one subject for ${ac.className}.` }, { status: 400 })
      }
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true },
    })
    if (existingUser) {
      return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 })
    }

    const currentYear = new Date().getFullYear();
    const teacherCount = await prisma.teacher.count();
    const sequence = (teacherCount + 1).toString().padStart(3, "0");
    const employeeId = `TCH-${currentYear}-${sequence}`;

    const hashedPassword = await bcrypt.hash(phone.trim(), 10);

    let photoUrl: string | null = null
    if (photo && photo.size > 0) {
      const { uploadPhoto } = await import("@/lib/uploadHelper")
      const result = await uploadPhoto(
        photo,
        "teacher-photos",
        "teachers",
        employeeId.replace(/[^a-zA-Z0-9]/g, "-")
      )

      if (!result.success) {
        return NextResponse.json({ error: result.error || "Photo upload failed." }, { status: 400 })
      }

      photoUrl = result.photoUrl || null
    }

    const teacher = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: email.toLowerCase().trim(),
          name: name.trim(),
          password: hashedPassword,
          role: "TEACHER",
          isActive: true,
        },
      });

      const newTeacher = await tx.teacher.create({
        data: {
          userId: newUser.id,
          employeeId,
          phone: phone.trim(),
          address: address.trim(),
          qualification: qualification.trim(),
          joiningDate: new Date(joiningDate),
          photoUrl,
          assignedClasses: {
            create: assignedClasses.map((ac) => ({
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
      { teacher, credentials: { email: email.toLowerCase().trim(), tempPassword: phone.trim() } },
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
