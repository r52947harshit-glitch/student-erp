import logger from "@/lib/logger"
import { NextResponse } from 'next/server'

export function handlePrismaError(error: unknown, defaultMessage: string = "Internal Server Error") {
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string }
    if (prismaError.code === 'P2002') {
      return NextResponse.json({ error: "Conflict: Record already exists." }, { status: 409 })
    }
    if (prismaError.code === 'P2025') {
      return NextResponse.json({ error: "Not Found: Record does not exist." }, { status: 404 })
    }
  }
  
  logger.error("Database Error:", error)
  return NextResponse.json({ error: defaultMessage }, { status: 500 })
}

