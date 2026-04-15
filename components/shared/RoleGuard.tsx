"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "./LoadingSpinner"
import { ShieldAlert } from "lucide-react"

export function RoleGuard({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (session && !allowedRoles.includes(session.user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md shadow-md">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto bg-red-100 p-4 rounded-full w-max">
              <ShieldAlert className="w-10 h-10 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold">403 Forbidden</CardTitle>
            <CardDescription>
              You do not have permission to view this directory.
              Your current role is <strong className="text-foreground">{session.user.role}</strong>.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" onClick={() => router.push(`/${session.user.role.toLowerCase()}/dashboard`)}>
              Return to My Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
