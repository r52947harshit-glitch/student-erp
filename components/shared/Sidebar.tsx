"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Receipt, Flag, LogOut, Banknote } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "../ui/button"

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { data: session } = useSession()
  const pathname = usePathname()

  const links = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Manage Students", href: "/admin/students", icon: Users },
    { name: "Manage Teachers", href: "/admin/teachers", icon: Users },
    { name: "Teacher Salary", href: "/admin/salary", icon: Banknote },
    { name: "Fee Management", href: "/admin/fee", icon: Receipt },
    { name: "Post Notice", href: "/admin/notice", icon: Flag },
  ]

  return (
    <aside className="w-full h-full flex flex-col bg-purple-900 text-purple-100 min-h-screen">
      <div className="p-6 border-b border-purple-800">
        <h2 className="text-2xl font-bold text-white tracking-tight">School ERP</h2>
        <p className="text-sm text-purple-300 mt-1">Admin Portal</p>
      </div>
      
      <nav className="flex-1 py-6 space-y-1 px-3">
        {links.map((link) => {
          const Icon = link.icon
          const isActive = pathname.startsWith(link.href)
          
          return (
            <Link
              key={link.name}
              href={link.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium",
                isActive 
                  ? "bg-purple-800 text-white shadow-sm" 
                  : "hover:bg-purple-800/50 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              {link.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-purple-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-4 rounded-md bg-purple-950/50">
          <div className="h-8 w-8 rounded-full bg-purple-700 flex items-center justify-center font-bold text-white">
            {session?.user?.name?.charAt(0) || "A"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {session?.user?.name || "Admin User"}
            </p>
            <p className="text-xs text-purple-300 truncate">
              {session?.user?.email || "admin@school.com"}
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full justify-start text-white bg-transparent border-purple-700 hover:bg-purple-800 hover:text-white"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  )
}
