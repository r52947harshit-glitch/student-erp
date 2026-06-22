"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { PageHeader } from "@/components/shared/PageHeader"
import { CalendarCheck, FileSpreadsheet, Bell, CheckCircle2, XCircle, User, ClipboardList, BookOpen } from "lucide-react"

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
  if (data?.error) return (
    <div className="p-6 text-center animate-in fade-in duration-300">
      <div className="bg-red-50 text-red-600 p-4 rounded-lg inline-block border border-red-200">
        <p className="font-bold">Access Error</p>
        <p className="text-sm mt-1">{data.error}. Please ensure your teacher profile is properly mapped by an administrator.</p>
      </div>
    </div>
  )

  const { teacher, attendanceStatus } = data

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader 
        title={`Welcome, ${session?.user?.name}!`} 
        description="Here is a quick overview of your assigned classes and pending tasks."
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Classes Card */}
        <Card className="border-emerald-100 shadow-sm col-span-1 lg:col-span-2">
          <CardHeader className="bg-emerald-50/50 pb-4 border-b border-emerald-50">
            <CardTitle className="text-lg flex items-center gap-2 text-emerald-900">
              <BookOpen className="h-5 w-5 text-emerald-600" />
              My Assigned Classes
            </CardTitle>
            <CardDescription>Classes where you are assigned as a subject or class teacher.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {teacher?.assignedClasses?.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {teacher.assignedClasses.map((ac: any) => (
                  <div key={ac.id} className="p-4 bg-white border border-emerald-100 rounded-lg shadow-sm hover:border-emerald-200 transition-colors">
                    <span className="font-bold text-emerald-900 text-lg block mb-1">Class {ac.className}</span>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {ac.subjects.map((sub: string) => (
                        <span key={sub} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground bg-emerald-50/30 rounded-lg border border-dashed border-emerald-200">
                <BookOpen className="h-8 w-8 mx-auto text-emerald-300 mb-2" />
                <p>No classes assigned yet.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Reviews Card */}
        <Link href="/teacher/assignments" className="block transition-transform hover:-translate-y-1 duration-200">
          <Card className="border-amber-200 shadow-sm h-full bg-gradient-to-br from-amber-50 to-orange-50 cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-amber-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-amber-600" /> Pending Reviews
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col justify-center items-center py-8">
              <div className="text-6xl font-black text-amber-600 tracking-tighter">
                {data.pendingReviews || 0}
              </div>
              <span className="text-sm text-amber-800 font-medium mt-2 text-center">Assignments waiting<br/>for your review</span>
            </CardContent>
          </Card>
        </Link>

        {/* Attendance Status Card */}
        <Card className="border-emerald-100 shadow-sm col-span-1 md:col-span-2 lg:col-span-3">
          <CardHeader className="bg-emerald-50/50 pb-4 border-b border-emerald-50">
            <CardTitle className="text-lg flex items-center gap-2 text-emerald-900">
              <CalendarCheck className="h-5 w-5 text-emerald-600" />
              Today's Attendance Overview
            </CardTitle>
            <CardDescription>Status of attendance marking for your assigned classes today.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {attendanceStatus?.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {attendanceStatus.map((status: any) => (
                  <div key={status.class} className="flex items-center gap-3 p-4 border border-emerald-100 rounded-xl bg-white shadow-sm">
                    {status.isMarked ? (
                      <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                        <XCircle className="w-6 h-6 text-rose-600" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-slate-900">Class {status.class}</p>
                      <p className={`text-xs font-medium ${status.isMarked ? "text-emerald-600" : "text-rose-600"}`}>
                        {status.isMarked ? "Submitted" : "Pending"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground bg-slate-50 rounded-lg border border-dashed">
                <p>No assigned classes to track attendance for.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="pt-4">
        <h3 className="text-xl font-bold mb-4 text-emerald-900 flex items-center gap-2">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/teacher/profile" className="group">
            <Button variant="outline" className="w-full h-auto py-6 border-emerald-200 text-emerald-800 hover:bg-emerald-50 hover:border-emerald-300 flex flex-col gap-3 shadow-sm transition-all group-hover:shadow-md">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <User className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="font-semibold">My Profile</span>
            </Button>
          </Link>
          <Link href="/teacher/attendance" className="group">
            <Button className="w-full h-auto py-6 bg-emerald-600 hover:bg-emerald-700 flex flex-col gap-3 shadow-sm transition-all group-hover:shadow-md">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CalendarCheck className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold">Mark Attendance</span>
            </Button>
          </Link>
          <Link href="/teacher/results" className="group">
            <Button variant="outline" className="w-full h-auto py-6 border-emerald-200 text-emerald-800 hover:bg-emerald-50 hover:border-emerald-300 flex flex-col gap-3 shadow-sm transition-all group-hover:shadow-md">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="font-semibold">Enter Results</span>
            </Button>
          </Link>
          <Link href="/teacher/notice" className="group">
            <Button variant="outline" className="w-full h-auto py-6 border-emerald-200 text-emerald-800 hover:bg-emerald-50 hover:border-emerald-300 flex flex-col gap-3 shadow-sm transition-all group-hover:shadow-md">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Bell className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="font-semibold">View Notices</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
