"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { CalendarCheck, Bell, CreditCard, FileSpreadsheet, BadgeCheck, AlertTriangle, BookOpen, GraduationCap, ChevronRight } from "lucide-react"

export default function StudentDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [unreadNotices, setUnreadNotices] = useState(0)

  useEffect(() => {
    fetch("/api/student/dashboard")
      .then(res => res.json())
      .then(d => {
        setData(d)
        // Calculate unread count (total available server-side minus tracked read array)
        if (d.metrics?.totalNotices) {
          const stored = localStorage.getItem("erp_student_read_notices")
          const readCount = stored ? JSON.parse(stored).length : 0
          setUnreadNotices(Math.max(0, d.metrics.totalNotices - readCount))
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="py-20"><LoadingSpinner /></div>
  if (data?.error) return (
    <div className="p-6 text-center animate-in fade-in duration-300">
      <div className="bg-red-50 text-red-600 p-4 rounded-lg inline-block border border-red-200">
        <p className="font-bold flex items-center justify-center gap-2">
          <AlertTriangle className="w-5 h-5" /> Access Error
        </p>
        <p className="text-sm mt-1">{data.error}</p>
      </div>
    </div>
  )

  const { student, metrics } = data

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Premium Profile Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white rounded-2xl shadow-lg border border-blue-500/20">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none translate-x-1/4 -translate-y-1/4">
          <GraduationCap className="w-96 h-96" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 p-6 sm:p-8">
          <div className="flex-shrink-0 relative group">
            {student.photoUrl ? (
              <img src={student.photoUrl} alt="Student" className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-blue-300/50 object-cover shadow-xl transition-transform group-hover:scale-105" />
            ) : (
              <div 
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-blue-300/50 flex items-center justify-center text-4xl font-bold uppercase shadow-xl transition-transform group-hover:scale-105"
                style={{ backgroundColor: (function(str: string) {
                  let hash = 0;
                  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
                  const color = Math.floor(Math.abs(Math.sin(hash) * 16777215)).toString(16);
                  return "#" + "000000".substring(0, 6 - color.length) + color;
                })(student.name) }}
              >
                {student.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="space-y-2 text-center sm:text-left flex-1">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">{student.name}</h2>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-blue-100 font-medium tracking-wide">
              <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm">Class {student.class}-{student.section}</span>
              <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm">Roll No: {student.rollNo}</span>
            </div>
            <div className="pt-2">
              <Link 
                href="/student/profile" 
                className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-blue-200 hover:text-white transition-colors group/link"
              >
                Update Profile <ChevronRight className="w-3.5 h-3.5 ml-1 group-hover/link:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-5">
        <Card className="border-blue-100 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-bold text-blue-900">Attendance</CardTitle>
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
              <CalendarCheck className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-800">{metrics.attendancePercentage}%</div>
            <p className="text-xs text-slate-500 mt-1 font-medium">Average present days</p>
          </CardContent>
        </Card>

        <Card className={`shadow-sm hover:shadow-md transition-shadow ${metrics.hasPendingFees ? 'border-red-200 bg-red-50/30' : 'border-emerald-200 bg-emerald-50/30'}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-bold text-slate-800">Fee Status</CardTitle>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${metrics.hasPendingFees ? 'bg-red-100' : 'bg-emerald-100'}`}>
              {metrics.hasPendingFees ? <AlertTriangle className="h-4 w-4 text-red-600" /> : <BadgeCheck className="h-4 w-4 text-emerald-600" />}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {metrics.hasPendingFees ? (
                <span className="text-red-700">Amount Due ⚠️</span>
              ) : (
                <span className="text-emerald-700">All Clear ✅</span>
              )}
            </div>
            {metrics.hasPendingFees ? (
              <p className="text-xs text-red-600 mt-1 font-medium">Check Fee tab to clear limits.</p>
            ) : (
              <p className="text-xs text-emerald-600 mt-1 font-medium">No pending dues.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-blue-100 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-bold text-blue-900">Last Result</CardTitle>
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
              <FileSpreadsheet className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-800">{metrics.lastResultPercentage ? `${metrics.lastResultPercentage}%` : "N/A"}</div>
            <p className="text-xs text-slate-500 mt-1 font-medium">Average scored</p>
          </CardContent>
        </Card>

        <Card className="border-blue-100 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-bold text-blue-900">Notices</CardTitle>
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
              <Bell className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-800">{unreadNotices}</div>
            <p className="text-xs text-slate-500 mt-1 font-medium">Unread alerts</p>
          </CardContent>
        </Card>

        <Link href="/student/assignments" className="block transition-transform hover:-translate-y-1 duration-200 col-span-2 lg:col-span-1">
          <Card className={`shadow-sm h-full cursor-pointer ${metrics.assignmentsDueSoon > 0 ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/50' : 'border-blue-100 bg-white hover:border-blue-200'}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className={`text-sm font-bold ${metrics.assignmentsDueSoon > 0 ? 'text-amber-900' : 'text-blue-900'}`}>Assignments Due</CardTitle>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${metrics.assignmentsDueSoon > 0 ? 'bg-amber-100' : 'bg-blue-50'}`}>
                <BookOpen className={`h-4 w-4 ${metrics.assignmentsDueSoon > 0 ? 'text-amber-600' : 'text-blue-600'}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-black ${metrics.assignmentsDueSoon > 0 ? 'text-amber-700' : 'text-slate-800'}`}>
                {metrics.assignmentsDueSoon > 0 ? metrics.assignmentsDueSoon : "0"}
              </div>
              <p className={`text-xs mt-1 font-medium ${metrics.assignmentsDueSoon > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                {metrics.assignmentsDueSoon > 0 ? "Due in next 3 days!" : "All caught up!"}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="pt-4">
        <h3 className="text-xl font-bold mb-4 text-blue-950 flex items-center gap-2">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/student/fee" className="group">
            <Button className="w-full h-auto py-6 bg-blue-600 hover:bg-blue-700 flex flex-col gap-3 shadow-md transition-all group-hover:shadow-lg">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-[15px]">Pay Fee Online</span>
            </Button>
          </Link>
          <Link href="/student/results" className="group">
            <Button variant="outline" className="w-full h-auto py-6 border-blue-200 text-blue-800 hover:bg-blue-50 hover:border-blue-300 flex flex-col gap-3 shadow-sm transition-all group-hover:shadow-md">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              </div>
              <span className="font-semibold text-[15px]">View Report Card</span>
            </Button>
          </Link>
          <Link href="/student/attendance" className="group">
            <Button variant="outline" className="w-full h-auto py-6 border-blue-200 text-blue-800 hover:bg-blue-50 hover:border-blue-300 flex flex-col gap-3 shadow-sm transition-all group-hover:shadow-md">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CalendarCheck className="w-5 h-5 text-blue-600" />
              </div>
              <span className="font-semibold text-[15px]">My Attendance</span>
            </Button>
          </Link>
          <Link href="/student/assignments" className="group">
            <Button variant="outline" className="w-full h-auto py-6 border-blue-200 text-blue-800 hover:bg-blue-50 hover:border-blue-300 flex flex-col gap-3 shadow-sm transition-all group-hover:shadow-md">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <span className="font-semibold text-[15px]">My Assignments</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
