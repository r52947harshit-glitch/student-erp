"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { CalendarCheck, FileSpreadsheet, Bell, CheckCircle2, XCircle } from "lucide-react"

export default function TeacherDashboard() {
  const { data: session } = useSession()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/teacher/dashboard")
      .then(res => res.json())
      .then(d => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />
  if (data?.error) return <div className="text-red-500">Error: {data.error}. Please ensure your teacher profile is properly mapped by an administrator.</div>

  const { teacher, attendanceStatus } = data

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-emerald-900">Welcome, {session?.user?.name}!</h2>
        <p className="text-muted-foreground mt-1">Here is a quick overview of your assigned classes.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Classes Card */}
        <Card className="border-emerald-100 shadow-sm">
          <CardHeader className="bg-emerald-50/50">
            <CardTitle className="text-lg">My Classes</CardTitle>
            <CardDescription>You are assigned as class teacher to:</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-2">
              {teacher?.assignedClasses?.length > 0 ? (
                teacher.assignedClasses.map((c: string) => (
                  <span key={c} className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-md text-sm font-medium">
                    Class {c}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No classes assigned.</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Attendance Status Card */}
        <Card className="border-emerald-100 shadow-sm col-span-1 lg:col-span-2">
          <CardHeader className="bg-emerald-50/50">
            <CardTitle className="text-lg">Today's Attendance Overview</CardTitle>
            <CardDescription>Status of rolls called for today</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {attendanceStatus?.map((status: any) => (
                <div key={status.class} className="flex items-center gap-3 p-3 border rounded-lg">
                  {status.isMarked ? (
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  ) : (
                    <XCircle className="w-8 h-8 text-rose-500" />
                  )}
                  <div>
                    <p className="text-sm font-bold">Class {status.class}</p>
                    <p className="text-xs text-muted-foreground">
                      {status.isMarked ? "Submitted ✅" : "Pending"}
                    </p>
                  </div>
                </div>
              ))}
              {(!attendanceStatus || attendanceStatus.length === 0) && (
                <div className="text-sm text-muted-foreground">No assigned classes to track.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-xl font-bold mt-8 mb-4 text-emerald-900">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/teacher/attendance">
            <Button className="w-full h-24 bg-emerald-600 hover:bg-emerald-700 flex flex-col gap-2 shadow-md">
              <CalendarCheck className="w-6 h-6" />
              Mark Attendance
            </Button>
          </Link>
          <Link href="/teacher/results">
            <Button variant="outline" className="w-full h-24 border-emerald-200 text-emerald-800 hover:bg-emerald-50 flex flex-col gap-2 shadow-sm">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
              Enter Exam Results
            </Button>
          </Link>
          <Link href="/teacher/notice">
            <Button variant="outline" className="w-full h-24 border-emerald-200 text-emerald-800 hover:bg-emerald-50 flex flex-col gap-2 shadow-sm">
              <Bell className="w-6 h-6 text-emerald-600" />
              View Notices
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
