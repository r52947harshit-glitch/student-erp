"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Bell, CreditCard, CalendarCheck, FileSpreadsheet, LogOut, Menu, BookOpen, UserCircle } from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getInitials, getAvatarColor } from "@/lib/formatters"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

export function StudentSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [studentData, setStudentData] = useState<any>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
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
    { name: "Assignments", href: "/student/assignments", icon: BookOpen },
    { name: "My Profile", href: "/student/profile", icon: UserCircle },
  ]

  const SidebarContent = () => (
    <div className="w-full h-full flex flex-col bg-blue-50 text-blue-900">
      <div className="p-6 border-b border-blue-200">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <span>🏫</span> School ERP
        </h2>
        <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-200 text-blue-800 uppercase tracking-wider">
          Student
        </div>
      </div>

      <div className="p-4 border-b border-blue-200 flex items-center gap-3">
        <Avatar className="h-10 w-10 border border-blue-300">
          <AvatarImage src={studentData?.photoUrl || (session?.user as any)?.image || ""} />
          <AvatarFallback className={cn("text-white text-sm font-medium", getAvatarColor(session?.user?.name || "S"))}>
            {getInitials(session?.user?.name || "S")}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">
            {session?.user?.name || "Student"}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {session?.user?.email}
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-3">
        {links.map((link) => {
          const Icon = link.icon
          const isActive = pathname.startsWith(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 transition-all text-sm font-medium",
                isActive 
                  ? "bg-blue-100 text-blue-900 shadow-sm" 
                  : "text-blue-700 hover:bg-blue-100/50"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {link.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-blue-200">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-muted-foreground hover:bg-destructive/10 hover:text-destructive" 
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  )

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="md:hidden absolute top-4 left-4 z-50 text-blue-600 border-blue-200">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 border-r-blue-200">
          <VisuallyHidden><SheetTitle>Navigation Menu</SheetTitle></VisuallyHidden>
          <SidebarContent />
        </SheetContent>
      </Sheet>

      <div className="hidden md:flex h-screen w-64 flex-col border-r border-blue-200 bg-blue-50 shrink-0 sticky top-0">
        <SidebarContent />
      </div>
    </>
  )
}
