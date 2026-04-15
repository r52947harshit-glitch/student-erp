"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { CalendarCheck, Bell, CreditCard, FileSpreadsheet, BadgeCheck, AlertTriangle } from "lucide-react"

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

  if (loading) return <LoadingSpinner />
  if (data?.error) return <div className="text-red-500">Error: {data.error}</div>

  const { student, metrics } = data

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6 p-6 bg-blue-600 text-white rounded-xl shadow-lg border border-blue-700">
        <div className="flex-shrink-0">
          {student.photoUrl ? (
            <img src={student.photoUrl} alt="Student" className="w-24 h-24 rounded-full border-4 border-blue-400 object-cover shadow-sm" />
          ) : (
            <div className="w-24 h-24 rounded-full border-4 border-blue-400 bg-blue-500 flex items-center justify-center text-3xl font-bold uppercase shadow-sm">
              {student.name.charAt(0)}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">{student.name}</h2>
          <p className="text-blue-200 font-medium tracking-wide">
            Class {student.class}-{student.section} | Roll No: {student.rollNo}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-blue-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-bold text-blue-900">Attendance</CardTitle>
            <CalendarCheck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.attendancePercentage}%</div>
            <p className="text-xs text-muted-foreground mt-1">Average present days</p>
          </CardContent>
        </Card>

        <Card className={`shadow-sm ${metrics.hasPendingFees ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-bold">Fee Status</CardTitle>
            {metrics.hasPendingFees ? <AlertTriangle className="h-4 w-4 text-red-500" /> : <BadgeCheck className="h-4 w-4 text-green-500" />}
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {metrics.hasPendingFees ? (
                <span className="text-red-700">Amount Due ⚠️</span>
              ) : (
                <span className="text-green-700">All Clear ✅</span>
              )}
            </div>
            {metrics.hasPendingFees && <p className="text-xs text-red-600 mt-1">Check Fee tab to clear limits.</p>}
          </CardContent>
        </Card>

        <Card className="border-blue-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-bold text-blue-900">Last Exam Result</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.lastResultPercentage ? `${metrics.lastResultPercentage}%` : "N/A"}</div>
            <p className="text-xs text-muted-foreground mt-1">Average scored</p>
          </CardContent>
        </Card>

        <Card className="border-blue-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-bold text-blue-900">Notifications</CardTitle>
            <Bell className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadNotices}</div>
            <p className="text-xs text-muted-foreground mt-1">Unread alerts to review</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-xl font-bold mt-8 mb-4 text-blue-900">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/student/fee">
            <Button className="w-full h-24 bg-blue-600 hover:bg-blue-700 flex flex-col gap-2 shadow-md">
              <CreditCard className="w-6 h-6" />
              Pay Fee Online
            </Button>
          </Link>
          <Link href="/student/results">
            <Button variant="outline" className="w-full h-24 border-blue-200 text-blue-800 hover:bg-blue-50 flex flex-col gap-2 shadow-sm">
              <FileSpreadsheet className="w-6 h-6 text-blue-600" />
              View Report Card
            </Button>
          </Link>
          <Link href="/student/attendance">
            <Button variant="outline" className="w-full h-24 border-blue-200 text-blue-800 hover:bg-blue-50 flex flex-col gap-2 shadow-sm">
              <CalendarCheck className="w-6 h-6 text-blue-600" />
              View Attendance
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
