"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Receipt, Flag, LogOut, Banknote } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getInitials, getAvatarColor } from "@/lib/formatters"

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
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <span>🏫</span> School ERP
        </h2>
        <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-800 text-purple-200 uppercase tracking-wider">
          Admin
        </div>
      </div>
      
      <div className="p-4 border-b border-purple-800 flex items-center gap-3">
        <Avatar className="h-10 w-10 border border-purple-700">
          <AvatarImage src={(session?.user as any)?.image || ""} />
          <AvatarFallback className={cn("text-white text-sm font-medium", getAvatarColor(session?.user?.name || "A"))}>
            {getInitials(session?.user?.name || "A")}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">
            {session?.user?.name || "Admin User"}
          </p>
          <p className="text-xs text-purple-300 truncate">
            {session?.user?.email || "admin@school.com"}
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-3">
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
                  : "hover:bg-purple-800/50 hover:text-white text-purple-200"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {link.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-purple-800">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-purple-200 hover:bg-destructive/10 hover:text-destructive"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  )
}
