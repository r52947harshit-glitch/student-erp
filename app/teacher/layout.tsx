import { RoleGuard } from "@/components/shared/RoleGuard"
import { TeacherSidebar } from "@/components/shared/TeacherSidebar"

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["TEACHER"]}>
      <div className="flex min-h-screen bg-slate-50">
        <TeacherSidebar />
        <main className="flex-1 overflow-x-hidden pt-16 md:pt-0">
          <div className="p-6 max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </RoleGuard>
  )
}
