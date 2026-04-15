"use client"

import { RoleGuard } from "@/components/shared/RoleGuard"
import { Sidebar } from "@/components/shared/Sidebar"
import { Menu } from "lucide-react"
import { useState } from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <div className="flex min-h-screen bg-slate-50">
        {/* Desktop Sidebar */}
        <div className="hidden md:block w-64 flex-shrink-0">
          <Sidebar />
        </div>

        {/* Mobile Sidebar & Header */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="md:hidden flex items-center justify-between p-4 bg-purple-900 text-white">
            <h1 className="font-bold text-lg">School ERP</h1>
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-purple-800">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 border-none">
                <Sidebar onNavigate={() => setIsOpen(false)} />
              </SheetContent>
            </Sheet>
          </header>
          <main className="flex-1 p-4 md:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </RoleGuard>
  )
}
