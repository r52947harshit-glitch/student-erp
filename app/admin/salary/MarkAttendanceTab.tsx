"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"

const STATUS_OPTIONS = [
  { value: "PRESENT", label: "● Present", color: "text-green-600" },
  { value: "ABSENT", label: "○ Absent", color: "text-red-600" },
  { value: "HALF_DAY", label: "◑ Half Day", color: "text-orange-500" },
  { value: "PAID_LEAVE", label: "✈ Paid Leave", color: "text-blue-500" },
  { value: "UNPAID_LEAVE", label: "✗ Unpaid Leave", color: "text-gray-500" },
]

interface TeacherRow {
  id: string
  name: string
  employeeId: string
  photoUrl: string | null
  attendance: { status: string; note: string | null } | null
}

export function MarkAttendanceTab() {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0])
  const [teachers, setTeachers] = useState<TeacherRow[]>([])
  const [records, setRecords] = useState<Record<string, { status: string; note: string }>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [markedDates, setMarkedDates] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  const loadTeachers = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/teacher-attendance?date=${date}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTeachers(data.teachers)
      const initial: Record<string, { status: string; note: string }> = {}
      data.teachers.forEach((t: TeacherRow) => {
        initial[t.id] = {
          status: t.attendance?.status || "PRESENT",
          note: t.attendance?.note || "",
        }
      })
      setRecords(initial)
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const loadMonthMarks = async () => {
    const d = new Date(date)
    const month = d.getMonth() + 1
    const year = d.getFullYear()
    try {
      const res = await fetch(`/api/teacher-attendance?month=${month}&year=${year}`)
      const data = await res.json()
      if (res.ok && data.teachers?.length > 0) {
        // A date is "marked" if at least one teacher has attendance for that date
        // We'll use the summary — if total > 0, the month has marks
        // For a simple calendar, let's just fetch all attendance for the month
        const allRes = await fetch(`/api/teacher-attendance?month=${month}&year=${year}`)
        const allData = await allRes.json()
        const dates = new Set<string>()
        allData.teachers?.forEach((t: any) => {
          if (t.summary?.total > 0) {
            // We know this teacher has marks, but not which dates
            // For simplicity, mark the month as having data
          }
        })
        setMarkedDates(dates)
      }
    } catch { /* ignore */ }
  }

  useEffect(() => {
    loadTeachers()
    loadMonthMarks()
  }, [date])

  const bulkSet = (status: string) => {
    const updated = { ...records }
    teachers.forEach(t => {
      updated[t.id] = { ...updated[t.id], status }
    })
    setRecords(updated)
  }

  const saveAttendance = async () => {
    setSaving(true)
    try {
      const payload = {
        date,
        records: Object.entries(records).map(([teacherId, r]) => ({
          teacherId,
          status: r.status,
          note: r.note || null,
        })),
      }
      const res = await fetch("/api/teacher-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: "Success", description: `Attendance saved for ${date} (${data.count} teachers)` })
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const today = new Date().toISOString().split("T")[0]

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Mark Teacher Attendance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1">
            <label className="text-sm font-medium">Date</label>
            <Input type="date" value={date} max={today} onChange={e => setDate(e.target.value)} className="w-48" />
          </div>
          <Button onClick={loadTeachers} variant="outline" disabled={loading}>
            {loading ? "Loading..." : "Load Teachers"}
          </Button>
        </div>

        {loading && <LoadingSpinner />}

        {!loading && teachers.length > 0 && (
          <>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => bulkSet("PRESENT")} className="text-green-600 border-green-200">Mark All Present</Button>
              <Button size="sm" variant="outline" onClick={() => bulkSet("ABSENT")} className="text-red-600 border-red-200">Mark All Absent</Button>
              <Button size="sm" variant="ghost" onClick={() => {
                const cleared: Record<string, { status: string; note: string }> = {}
                teachers.forEach(t => { cleared[t.id] = { status: "PRESENT", note: "" } })
                setRecords(cleared)
              }}>Clear All</Button>
            </div>

            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left p-3 font-semibold">Teacher</th>
                    <th className="text-left p-3 font-semibold">Employee ID</th>
                    <th className="text-left p-3 font-semibold w-48">Status</th>
                    <th className="text-left p-3 font-semibold">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map(t => (
                    <tr key={t.id} className="border-b hover:bg-slate-50/50">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {t.photoUrl ? (
                            <img src={t.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">{t.name.charAt(0)}</div>
                          )}
                          <span className="font-medium">{t.name}</span>
                          {t.attendance && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Already marked</span>}
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">{t.employeeId}</td>
                      <td className="p-3">
                        <Select
                          value={records[t.id]?.status || "PRESENT"}
                          onValueChange={v => setRecords({ ...records, [t.id]: { ...records[t.id], status: v } })}
                        >
                          <SelectTrigger className="w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <span className={opt.color}>{opt.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3">
                        <Input
                          placeholder="Optional note"
                          value={records[t.id]?.note || ""}
                          onChange={e => setRecords({ ...records, [t.id]: { ...records[t.id], note: e.target.value } })}
                          className="max-w-xs"
                        />
                      </td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            </div>

            <Button onClick={saveAttendance} disabled={saving} className="w-full sm:w-auto">
              {saving ? "Saving..." : `Save Attendance (${teachers.length} teachers)`}
            </Button>
          </>
        )}

        {!loading && teachers.length === 0 && (
          <p className="text-muted-foreground text-sm">Select a date and click "Load Teachers" to begin.</p>
        )}
      </CardContent>
    </Card>
  )
}
