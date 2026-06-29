import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

const roleDashboardPaths = {
  ADMIN: "/admin/dashboard",
  TEACHER: "/teacher/dashboard",
  STUDENT: "/student/dashboard",
} as const

type Role = keyof typeof roleDashboardPaths

function isRole(role: unknown): role is Role {
  return typeof role === "string" && role in roleDashboardPaths
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname
    const role = token?.role

    if (pathname === "/login" || pathname === "/") {
      return NextResponse.next()
    }

    if (!isRole(role)) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    // Role-based redirect if accessing wrong portal
    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL(roleDashboardPaths[role], req.url))
    }
    if (pathname.startsWith("/teacher") && role !== "TEACHER") {
      return NextResponse.redirect(new URL(roleDashboardPaths[role], req.url))
    }
    if (pathname.startsWith("/student") && role !== "STUDENT") {
      return NextResponse.redirect(new URL(roleDashboardPaths[role], req.url))
    }

    return NextResponse.next()
  },
  {
    pages: {
      signIn: "/login",
    },
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
