"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Bell, CreditCard, CalendarCheck, FileSpreadsheet, LogOut, Menu } from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export function StudentSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [studentData, setStudentData] = useState<any>(null)

  useEffect(() => {
    // We fetch the dashboard data so we can populate the sidebar with Class/RollNo
    fetch('/api/student/dashboard')
      .then(res => res.json())
      .then(data => {
         if (!data.error) setStudentData(data.student)
      })
      .catch(console.error)
  }, [])

  const links = [
    { name: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
    { name: "Notice Board", href: "/student/notice", icon: Bell },
    { name: "Pay Fee", href: "/student/fee", icon: CreditCard },
    { name: "Attendance", href: "/student/attendance", icon: CalendarCheck },
    { name: "Results", href: "/student/results", icon: FileSpreadsheet },
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
              "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-blue-900",
              isActive ? "bg-blue-100 text-blue-900 font-bold" : "text-blue-700 hover:bg-blue-50 font-medium"
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
    <div className="mt-auto border-t border-blue-200 p-4">
      <div className="flex flex-col text-sm text-blue-800 mb-4">
        <span className="font-bold">{session?.user?.name || "Student"}</span>
        {studentData ? (
          <span className="text-xs text-blue-600 mt-1 font-medium bg-blue-100 rounded px-2 w-max p-1">
            Class {studentData.class}-{studentData.section} | Roll: {studentData.rollNo}
          </span>
        ) : (
          <span className="text-xs text-blue-600 mt-1">{session?.user?.email}</span>
        )}
      </div>
      <Button 
        variant="outline" 
        className="w-full justify-start text-blue-700 border-blue-200 hover:bg-blue-50 hover:text-blue-900" 
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
          <Button variant="outline" size="icon" className="md:hidden absolute top-4 left-4 z-50 text-blue-600 border-blue-200">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 bg-blue-50 border-r-blue-200 flex flex-col">
          <div className="p-6 pb-0">
            <h1 className="text-2xl font-bold text-blue-900">ERP <span className="text-blue-600 font-light">Student</span></h1>
          </div>
          <div className="flex-1 px-4 overflow-y-auto">
            <NavLinks />
          </div>
          <UserInfo />
        </SheetContent>
      </Sheet>

      <div className="hidden md:flex h-screen w-64 flex-col border-r border-blue-200 bg-blue-50 shrink-0 sticky top-0">
        <div className="p-6 pb-0">
          <h1 className="text-2xl font-bold text-blue-900">ERP <span className="text-blue-600 font-light">Student</span></h1>
        </div>
        <div className="flex-1 px-4 overflow-y-auto">
          <NavLinks />
        </div>
        <UserInfo />
      </div>
    </>
  )
}
