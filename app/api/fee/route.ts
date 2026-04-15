import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateSession } from "@/lib/apiAuth"
import { feeStructureSchema } from "@/lib/validations"
import { handlePrismaError } from "@/lib/prisma-error"

export async function GET() {
  const { errorResponse } = await validateSession(["ADMIN"])
  if (errorResponse) return errorResponse
  const structures = await prisma.feeStructure.findMany({ orderBy: { class: 'asc' } })
  return NextResponse.json(structures)
}

export async function POST(request: Request) {
  const { errorResponse } = await validateSession(["ADMIN"])
  if (errorResponse) return errorResponse
  
  try {
    const body = await request.json()
    // Parse numeric fields properly (fee structures pass amounts occasionally as strings from UI)
    const payload = { ...body, amount: typeof body.amount === 'string' ? parseFloat(body.amount) : body.amount }
    const parseResult = feeStructureSchema.safeParse(payload)

    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.issues[0].message }, { status: 400 })
    }

    const { class: className, type, amount, dueDate } = parseResult.data

    const fee = await prisma.feeStructure.create({
      data: { class: className, type, amount, dueDate: new Date(dueDate) }
    })

    const { session } = await validateSession(["ADMIN"])
    if (session) {
      await prisma.auditLog.create({
         data: {
           action: "FEE_STRUCTURE_CREATED",
           performedBy: session.user.id,
           targetId: fee.id,
           note: `Created fee structure ${type} for Class ${className}`
         }
      })
    }

    return NextResponse.json(fee)
  } catch (error) {
    return handlePrismaError(error, "Failed to create fee structure")
  }
}
