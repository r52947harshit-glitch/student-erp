"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isWeekend, isFuture } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { CalendarCheck, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]
const DAYS_HEADER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export default function StudentAttendance() {
  const { toast } = useToast()
  const now = new Date()

  const [month, setMonth] = useState(now.getMonth() + 1) // 1-indexed
  const [year, setYear] = useState(now.getFullYear())
  const [records, setRecords] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAttendance()
  }, [month, year])

  const loadAttendance = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/attendance/student?month=${month}&year=${year}`)
      const data = await res.json()
      setRecords(data.records || [])
      setStats(data.stats || null)
    } catch {
      toast({ title: "Error", description: "Failed to load attendance data", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handlePrevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  const handleNextMonth = () => {
    const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear()
    if (isCurrentMonth) return // can't go to future
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  // Build calendar grid
  const monthStart = startOfMonth(new Date(year, month - 1))
  const monthEnd = endOfMonth(monthStart)
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startDayOfWeek = getDay(monthStart) // 0=Sun

  const getStatusForDate = (date: Date) => {
    const record = records.find((r: any) => isSameDay(new Date(r.date), date))
    return record?.status || null
  }

  const getCellColor = (date: Date) => {
    if (isFuture(date)) return "bg-slate-50 text-slate-300"
    if (isWeekend(date)) return "bg-slate-100 text-slate-400"

    const status = getStatusForDate(date)
    switch (status) {
      case "PRESENT": return "bg-green-100 text-green-800 border-green-300 font-bold"
      case "ABSENT": return "bg-red-100 text-red-800 border-red-300 font-bold"
      case "LEAVE": return "bg-yellow-100 text-yellow-800 border-yellow-300 font-bold"
      default: return "bg-slate-50 text-slate-400" // no record
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight text-blue-900">My Attendance</h2>

      {/* Overall Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="text-center border-blue-100">
            <CardContent className="pt-6">
              <p className="text-3xl font-bold text-blue-700">{stats.percentage}%</p>
              <p className="text-xs text-muted-foreground font-medium mt-1">Overall Attendance</p>
            </CardContent>
          </Card>
          <Card className="text-center border-green-100">
            <CardContent className="pt-6">
              <p className="text-2xl font-bold text-green-700">{stats.presentDays}</p>
              <p className="text-xs text-muted-foreground font-medium mt-1">Present</p>
            </CardContent>
          </Card>
          <Card className="text-center border-red-100">
            <CardContent className="pt-6">
              <p className="text-2xl font-bold text-red-700">{stats.absentDays}</p>
              <p className="text-xs text-muted-foreground font-medium mt-1">Absent</p>
            </CardContent>
          </Card>
          <Card className="text-center border-yellow-100">
            <CardContent className="pt-6">
              <p className="text-2xl font-bold text-yellow-700">{stats.leaveDays}</p>
              <p className="text-xs text-muted-foreground font-medium mt-1">Leave</p>
            </CardContent>
          </Card>
          <Card className="text-center border-slate-100">
            <CardContent className="pt-6">
              <p className="text-2xl font-bold text-slate-700">{stats.totalDays}</p>
              <p className="text-xs text-muted-foreground font-medium mt-1">Total Days</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Calendar Card */}
      <Card className="border-blue-100">
        <CardHeader className="bg-blue-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarCheck className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-lg">Attendance Calendar</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handlePrevMonth}><ChevronLeft className="w-4 h-4" /></Button>
              <span className="text-sm font-bold min-w-[140px] text-center">{MONTHS[month - 1]} {year}</span>
              <Button variant="ghost" size="icon" onClick={handleNextMonth} disabled={month === now.getMonth() + 1 && year === now.getFullYear()}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <div className="flex justify-center p-12"><LoadingSpinner /></div>
          ) : (
            <>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAYS_HEADER.map(d => (
                  <div key={d} className="text-center text-xs font-bold text-muted-foreground py-2">{d}</div>
                ))}
              </div>

              {/* Calendar cells */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty spacers for alignment */}
                {Array.from({ length: startDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {allDays.map(day => {
                  const cellColor = getCellColor(day)
                  const status = getStatusForDate(day)

                  return (
                    <div
                      key={day.toISOString()}
                      className={`aspect-square flex flex-col items-center justify-center rounded-lg border text-xs transition-all ${cellColor}`}
                      title={status ? `${format(day, "PP")}: ${status}` : format(day, "PP")}
                    >
                      <span className="font-medium">{day.getDate()}</span>
                      {status && (
                        <span className="text-[9px] font-bold mt-0.5">
                          {status === "PRESENT" ? "P" : status === "ABSENT" ? "A" : "L"}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t">
                <div className="flex items-center gap-2 text-xs"><div className="w-4 h-4 rounded bg-green-200 border border-green-300" /> Present</div>
                <div className="flex items-center gap-2 text-xs"><div className="w-4 h-4 rounded bg-red-200 border border-red-300" /> Absent</div>
                <div className="flex items-center gap-2 text-xs"><div className="w-4 h-4 rounded bg-yellow-200 border border-yellow-300" /> Leave</div>
                <div className="flex items-center gap-2 text-xs"><div className="w-4 h-4 rounded bg-slate-100 border border-slate-200" /> Holiday / No Data</div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
