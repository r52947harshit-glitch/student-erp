import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname
    const role = token?.role as string | undefined

    // Role-based redirect if accessing wrong portal
    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(
        new URL(`/${role?.toLowerCase()}/dashboard`, req.url)
      )
    }
    if (pathname.startsWith("/teacher") && role !== "TEACHER") {
      return NextResponse.redirect(
        new URL(`/${role?.toLowerCase()}/dashboard`, req.url)
      )
    }
    if (pathname.startsWith("/student") && role !== "STUDENT") {
      return NextResponse.redirect(
        new URL(`/${role?.toLowerCase()}/dashboard`, req.url)
      )
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized({ token, req }) {
        const pathname = req.nextUrl.pathname
        // Public routes
        if (pathname === "/login" || pathname === "/") return true
        // All other routes need a valid token
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    "/((?!api/auth|api/payments/webhook|_next/static|_next/image|favicon.ico).*)",
  ],
}
