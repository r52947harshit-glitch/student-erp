"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isWeekend, isFuture } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { PageHeader } from "@/components/shared/PageHeader"
import { CalendarCheck, ChevronLeft, ChevronRight, Activity, TrendingUp, TrendingDown, Clock } from "lucide-react"
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
    if (isFuture(date)) return "bg-slate-50 text-slate-300 border-slate-100"
    if (isWeekend(date)) return "bg-slate-100/50 text-slate-400 border-slate-200"

    const status = getStatusForDate(date)
    switch (status) {
      case "PRESENT": return "bg-emerald-50 text-emerald-800 border-emerald-200 shadow-sm"
      case "ABSENT": return "bg-rose-50 text-rose-800 border-rose-200 shadow-sm"
      case "LEAVE": return "bg-amber-50 text-amber-800 border-amber-200 shadow-sm"
      default: return "bg-white text-slate-600 border-slate-200 hover:border-blue-200" // no record
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader 
        title="My Attendance" 
        description="Track your daily attendance records and monthly statistics."
      />

      {/* Overall Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="text-center border-blue-200 shadow-sm bg-gradient-to-br from-blue-50 to-white col-span-2 md:col-span-1">
            <CardContent className="pt-6 pb-6">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-4xl font-black text-blue-700">{stats.percentage}%</p>
              <p className="text-xs text-blue-600/80 font-bold uppercase tracking-wider mt-2">Overall Rate</p>
            </CardContent>
          </Card>
          
          <Card className="text-center border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6 pb-6">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-3xl font-bold text-emerald-700">{stats.presentDays}</p>
              <p className="text-xs text-emerald-600/80 font-bold uppercase tracking-wider mt-2">Present</p>
            </CardContent>
          </Card>
          
          <Card className="text-center border-rose-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6 pb-6">
              <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-3">
                <TrendingDown className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-3xl font-bold text-rose-700">{stats.absentDays}</p>
              <p className="text-xs text-rose-600/80 font-bold uppercase tracking-wider mt-2">Absent</p>
            </CardContent>
          </Card>
          
          <Card className="text-center border-amber-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6 pb-6">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-3xl font-bold text-amber-700">{stats.leaveDays}</p>
              <p className="text-xs text-amber-600/80 font-bold uppercase tracking-wider mt-2">Leave</p>
            </CardContent>
          </Card>
          
          <Card className="text-center border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6 pb-6">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <CalendarCheck className="w-4 h-4 text-slate-600" />
              </div>
              <p className="text-3xl font-bold text-slate-700">{stats.totalDays}</p>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-2">Total Days</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Calendar Card */}
      <Card className="border-blue-100 shadow-sm overflow-hidden">
        <CardHeader className="bg-blue-50/50 border-b border-blue-50 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <CardTitle className="text-lg text-blue-950">Attendance Calendar</CardTitle>
            </div>
            
            <div className="flex items-center gap-2 bg-white rounded-lg border shadow-sm p-1">
              <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8 hover:bg-slate-100 hover:text-blue-700">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-sm font-bold w-[130px] text-center text-slate-800 uppercase tracking-wide">
                {MONTHS[month - 1]} {year}
              </div>
              <Button variant="ghost" size="icon" onClick={handleNextMonth} disabled={month === now.getMonth() + 1 && year === now.getFullYear()} className="h-8 w-8 hover:bg-slate-100 hover:text-blue-700">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 pb-8 px-4 sm:px-8">
          {loading ? (
            <div className="flex justify-center py-24"><LoadingSpinner /></div>
          ) : (
            <div className="max-w-3xl mx-auto">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                {DAYS_HEADER.map(d => (
                  <div key={d} className="text-center text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider py-2">{d}</div>
                ))}
              </div>

              {/* Calendar cells */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
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
                      className={`aspect-square flex flex-col items-center justify-center rounded-xl border-2 transition-all ${cellColor}`}
                      title={status ? `${format(day, "PP")}: ${status}` : format(day, "PP")}
                    >
                      <span className={`text-sm sm:text-base ${status ? 'font-black' : 'font-semibold'}`}>
                        {day.getDate()}
                      </span>
                      {status && (
                        <span className={`text-[10px] sm:text-xs font-bold mt-1 tracking-wider ${
                          status === 'PRESENT' ? 'text-emerald-600' :
                          status === 'ABSENT' ? 'text-rose-600' : 'text-amber-600'
                        }`}>
                          {status === "PRESENT" ? "P" : status === "ABSENT" ? "A" : "L"}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap justify-center gap-4 sm:gap-8 mt-10 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2.5 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm" /> 
                  <span className="text-xs font-bold text-slate-700 tracking-wide uppercase">Present</span>
                </div>
                <div className="flex items-center gap-2.5 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                  <div className="w-3 h-3 rounded-full bg-rose-400 shadow-sm" /> 
                  <span className="text-xs font-bold text-slate-700 tracking-wide uppercase">Absent</span>
                </div>
                <div className="flex items-center gap-2.5 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                  <div className="w-3 h-3 rounded-full bg-amber-400 shadow-sm" /> 
                  <span className="text-xs font-bold text-slate-700 tracking-wide uppercase">Leave</span>
                </div>
                <div className="flex items-center gap-2.5 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                  <div className="w-3 h-3 rounded-full bg-slate-200 shadow-sm" /> 
                  <span className="text-xs font-bold text-slate-500 tracking-wide uppercase">Holiday / No Data</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
