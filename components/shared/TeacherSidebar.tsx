"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { CalendarCheck, LayoutDashboard, FileSpreadsheet, Bell, LogOut, Menu, User, BookOpen } from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export function TeacherSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [teacherData, setTeacherData] = useState<any>(null)

  useEffect(() => {
    // Fetch specifically assigned classes to show in sidebar
    fetch('/api/teacher/dashboard')
      .then(res => res.json())
      .then(data => setTeacherData(data))
      .catch(console.error)
  }, [])

  const links = [
    { name: "Dashboard", href: "/teacher/dashboard", icon: LayoutDashboard },
    { name: "My Profile", href: "/teacher/profile", icon: User },
    { name: "Mark Attendance", href: "/teacher/attendance", icon: CalendarCheck },
    { name: "Enter Results", href: "/teacher/results", icon: FileSpreadsheet },
    { name: "Assignments", href: "/teacher/assignments", icon: BookOpen },
    { name: "Notice Board", href: "/teacher/notice", icon: Bell },
  ]

  const NavLinks = () => (
    <nav className="flex flex-col gap-2 mt-6">
      {links.map((link) => {
        const Icon = link.icon
        const isActive = pathname === link.href
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-emerald-900",
              isActive ? "bg-emerald-100 text-emerald-900 font-medium" : "text-emerald-700 hover:bg-emerald-50"
            )}
          >
            <Icon className="h-4 w-4" />
            {link.name}
          </Link>
        )
      })}
    </nav>
  )

  const UserInfo = () => (
    <div className="mt-auto border-t border-emerald-200 p-4">
      <div className="flex flex-col text-sm text-emerald-800 mb-4">
        <span className="font-semibold">{session?.user?.name || "Teacher"}</span>
        <span className="text-xs text-emerald-600">{session?.user?.email}</span>
        {teacherData?.teacher?.assignedClasses && (
          <span className="text-xs text-emerald-600 mt-1 font-medium bg-emerald-100 rounded px-2 w-max">
            Classes: {teacherData.teacher.assignedClasses.join(", ")}
          </span>
        )}
      </div>
      <Button 
        variant="outline" 
        className="w-full justify-start text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-900" 
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Logout
      </Button>
    </div>
  )

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="md:hidden absolute top-4 left-4 z-50 text-emerald-600 border-emerald-200">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 bg-emerald-50 border-r-emerald-200 flex flex-col">
          <div className="p-6 pb-0">
            <h1 className="text-2xl font-bold text-emerald-900">ERP <span className="text-emerald-600 font-light">Teacher</span></h1>
          </div>
          <div className="flex-1 px-4 overflow-y-auto">
            <NavLinks />
          </div>
          <UserInfo />
        </SheetContent>
      </Sheet>

      <div className="hidden md:flex h-screen w-64 flex-col border-r border-emerald-200 bg-emerald-50 shrink-0 sticky top-0">
        <div className="p-6 pb-0">
          <h1 className="text-2xl font-bold text-emerald-900">ERP <span className="text-emerald-600 font-light">Teacher</span></h1>
        </div>
        <div className="flex-1 px-4 overflow-y-auto">
          <NavLinks />
        </div>
        <UserInfo />
      </div>
    </>
  )
}
