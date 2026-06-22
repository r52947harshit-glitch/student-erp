"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { CalendarCheck, LayoutDashboard, FileSpreadsheet, Bell, LogOut, Menu, User, BookOpen } from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getInitials, getAvatarColor } from "@/lib/formatters"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

export function TeacherSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [teacherData, setTeacherData] = useState<any>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
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

  const SidebarContent = () => (
    <div className="w-full h-full flex flex-col bg-emerald-50 text-emerald-900">
      <div className="p-6 border-b border-emerald-200">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <span>🏫</span> School ERP
        </h2>
        <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-200 text-emerald-800 uppercase tracking-wider">
          Teacher
        </div>
      </div>

      <div className="p-4 border-b border-emerald-200 flex items-center gap-3">
        <Avatar className="h-10 w-10 border border-emerald-300">
          <AvatarImage src={teacherData?.teacher?.photoUrl || (session?.user as any)?.image || ""} />
          <AvatarFallback className={cn("text-white text-sm font-medium", getAvatarColor(session?.user?.name || "T"))}>
            {getInitials(session?.user?.name || "T")}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">
            {session?.user?.name || "Teacher"}
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
                  ? "bg-emerald-100 text-emerald-900 shadow-sm" 
                  : "text-emerald-700 hover:bg-emerald-100/50"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {link.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-emerald-200">
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
          <Button variant="outline" size="icon" className="md:hidden absolute top-4 left-4 z-50 text-emerald-600 border-emerald-200">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 border-r-emerald-200">
          <VisuallyHidden><SheetTitle>Navigation Menu</SheetTitle></VisuallyHidden>
          <SidebarContent />
        </SheetContent>
      </Sheet>

      <div className="hidden md:flex h-screen w-64 flex-col border-r border-emerald-200 bg-emerald-50 shrink-0 sticky top-0">
        <SidebarContent />
      </div>
    </>
  )
}
