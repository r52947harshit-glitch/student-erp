// Before using this route, create a Supabase Storage bucket 
// named 'teacher-photos' with:
// - Public: true
// - Max file size: 2MB
// - Allowed MIME types: image/jpeg, image/png

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/apiAuth";
import { handlePrismaError } from "@/lib/prisma-error";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { errorResponse, session } = await validateSession(["ADMIN"]);
  if (errorResponse || !session)
    return errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "File exceeds 2MB limit" }, { status: 400 });
    }

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      return NextResponse.json({ error: "Only JPG and PNG images are allowed" }, { status: 400 });
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: params.id },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    const ext = file.type === "image/png" ? "png" : "jpg";
    const fileName = `teachers/${teacher.id}/${Date.now()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { data, error } = await supabase.storage
      .from("teacher-photos")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json({ error: "Failed to upload photo to storage" }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from("teacher-photos")
      .getPublicUrl(fileName);

    const photoUrl = publicUrlData.publicUrl;

    await prisma.$transaction(async (tx) => {
      await tx.teacher.update({
        where: { id: teacher.id },
        data: { photoUrl },
      });

      await tx.auditLog.create({
        data: {
          action: "TEACHER_PHOTO_UPLOAD",
          performedBy: session.user.id,
          targetId: teacher.id,
          note: `Admin uploaded a new profile photo for teacher ${teacher.employeeId}`,
        },
      });
    });

    return NextResponse.json({ photoUrl });
  } catch (error) {
    return handlePrismaError(error, "Failed to upload photo");
  }
}
