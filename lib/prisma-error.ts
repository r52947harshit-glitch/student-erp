import logger from "@/lib/logger"
import { NextResponse } from 'next/server'

export function handlePrismaError(error: any, defaultMessage: string = "Internal Server Error") {
  if (error?.code === 'P2002') {
    return NextResponse.json({ error: "Conflict: Record already exists." }, { status: 409 })
  }
  if (error?.code === 'P2025') {
    return NextResponse.json({ error: "Not Found: Record does not exist." }, { status: 404 })
  }
  
  logger.error("Database Error:", error)
  return NextResponse.json({ error: defaultMessage }, { status: 500 })
}

