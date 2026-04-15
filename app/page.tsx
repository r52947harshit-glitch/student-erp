import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth"

export default async function RootPage() {
  const session = await getAuthSession()

  if (!session) {
    redirect("/login")
  }

  const role = session.user.role

  if (role === "ADMIN") redirect("/admin")
  if (role === "TEACHER") redirect("/teacher")
  if (role === "STUDENT") redirect("/student")

  // Fallback — unknown role
  redirect("/login")
}
