import { NextResponse } from "next/server"

export class ApiResponse {
  static success(data: any, status = 200) {
    return NextResponse.json({ success: true, data }, { status })
  }

  static error(message: string, status = 400) {
    return NextResponse.json({ success: false, error: message }, { status })
  }

  static notFound(entityName: string) {
    return NextResponse.json({ success: false, error: `${entityName} not found` }, { status: 404 })
  }
}
