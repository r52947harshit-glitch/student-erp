import { RoleGuard } from "@/components/shared/RoleGuard"
import { StudentSidebar } from "@/components/shared/StudentSidebar"

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["STUDENT"]}>
      <div className="flex min-h-screen bg-slate-50">
        <StudentSidebar />
        <main className="flex-1 overflow-x-hidden pt-16 md:pt-0">
          <div className="p-6 max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </RoleGuard>
  )
}
