"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2, CheckCircle2, Users, CalendarCheck, AlertTriangle } from "lucide-react"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"

export default function MarkAttendance() {
  const { toast } = useToast()
  
  const [classes, setClasses] = useState<string[]>([])
  const [selectedClass, setSelectedClass] = useState("")
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [maxDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [isClassTeacher, setIsClassTeacher] = useState<boolean | null>(null)

  const [students, setStudents] = useState<any[]>([])
  const [attendanceState, setAttendanceState] = useState<Record<string, string>>({})
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submittedRecords, setSubmittedRecords] = useState<any[]>([])
  
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // 1. Fetch assigned classes
  useEffect(() => {
    fetch("/api/class-teacher/my-class")
      .then(res => res.json())
      .then(d => {
        setIsClassTeacher(d.isClassTeacher)
        if (d.isClassTeacher) {
          setClasses([d.className])
          setSelectedClass(d.className)
        }
      })
  }, [])

  // 2. Fetch attendance lock status & students
  useEffect(() => {
    if (!selectedClass || !date) return
    loadAttendanceData()
  }, [selectedClass, date])

  const loadAttendanceData = async () => {
    setLoading(true)
    try {
      // Check if locked
      const checkRes = await fetch(`/api/attendance?class=${selectedClass}&date=${date}`)
      const checkData = await checkRes.json()

      if (checkData.isSubmitted) {
        setIsSubmitted(true)
        setSubmittedRecords(checkData.records)
      } else {
        setIsSubmitted(false)
        // Fetch raw students
        const stRes = await fetch(`/api/attendance/students?class=${selectedClass}`)
        const stData = await stRes.json()
        setStudents(stData)

        // Initialize state to PRESENT
        const initialFocus: Record<string, string> = {}
        stData.forEach((s: any) => initialFocus[s.id] = "PRESENT")
        setAttendanceState(initialFocus)
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAll = (status: "PRESENT"|"ABSENT"|"LEAVE") => {
    const newState = { ...attendanceState }
    Object.keys(newState).forEach(id => newState[id] = status)
    setAttendanceState(newState)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const attendanceList = Object.entries(attendanceState).map(([studentId, status]) => ({
        studentId, status
      }))

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, attendanceList })
      })

      if (!res.ok) throw new Error()
      
      toast({ title: "Success", description: "Attendance successfully mapped." })
      setConfirmOpen(false)
      loadAttendanceData() // Reloads dynamically transitioning into read-only
    } catch (e) {
      toast({ title: "Error", description: "Failed to submit attendance.", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  if (isClassTeacher === false) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <PageHeader title="Mark Attendance" description="Record daily attendance for your class." />
        <Card className="border-emerald-100 max-w-2xl mx-auto mt-12 shadow-sm">
          <CardContent className="pt-12 pb-12 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-2">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800">Access Restricted</h3>
            <p className="text-slate-600 max-w-md">
              You are currently not assigned as a Class Teacher. Only class teachers can mark daily student attendance.
            </p>
            <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg border mt-4">
              If you believe this is an error, please contact the school administrator to update your profile.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader 
        title="Mark Attendance" 
        description={`Record daily attendance for Class ${selectedClass || "..."}`}
      />
      
      <Card className="border-emerald-100 shadow-sm">
        <CardHeader className="bg-emerald-50/50 pb-4 border-b border-emerald-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-emerald-900 flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-emerald-600" />
              Attendance Register
            </CardTitle>
            <CardDescription>Select a date to view or mark attendance</CardDescription>
          </div>
          <div className="flex items-center gap-3 bg-white p-2 rounded-lg border shadow-sm">
            <Label className="text-slate-500 pl-2">Date:</Label>
            <Input 
              type="date" 
              value={date} 
              max={maxDate} 
              onChange={(e) => setDate(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 shadow-none"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-6">
          <div className="rounded-md sm:border overflow-hidden">
            {loading ? (
              <div className="p-12 flex justify-center"><LoadingSpinner /></div>
            ) : isSubmitted ? (
              <div className="p-0">
                <div className="bg-emerald-50 p-4 sm:border-b sm:border-emerald-100 flex items-center gap-3 text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <p className="text-sm">
                    <strong>Attendance Submitted</strong> for Class {selectedClass} on <strong>{format(new Date(date), 'PP')}</strong>. This record is now locked and read-only.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <Table className="min-w-[600px]">
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[100px]">Roll No</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {submittedRecords.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.student.rollNo}</TableCell>
                          <TableCell>{r.student.user.name}</TableCell>
                          <TableCell>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              r.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' :
                              r.status === 'ABSENT' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {r.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 bg-slate-50 border-b gap-4">
                  <span className="text-sm text-emerald-800 font-medium flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    Tracking {students.length} students
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleMarkAll("PRESENT")} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">All Present</Button>
                    <Button variant="outline" size="sm" onClick={() => handleMarkAll("ABSENT")} className="border-rose-200 text-rose-700 hover:bg-rose-50">All Absent</Button>
                    <Button variant="outline" size="sm" onClick={() => handleMarkAll("LEAVE")} className="border-amber-200 text-amber-700 hover:bg-amber-50">All Leave</Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table className="min-w-[600px]">
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[100px]">Roll No</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead className="w-[300px]">Attendance Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-12">
                            <EmptyState 
                              icon={Users}
                              title="No students found"
                              description={`There are no students enrolled in Class ${selectedClass}.`}
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        students.map(s => (
                          <TableRow key={s.id} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="font-medium text-slate-600">{s.rollNo}</TableCell>
                            <TableCell className="font-semibold text-slate-900">{s.user.name}</TableCell>
                            <TableCell>
                              <RadioGroup 
                                value={attendanceState[s.id]} 
                                onValueChange={(val) => setAttendanceState({...attendanceState, [s.id]: val})}
                                className="flex gap-1 sm:gap-4 p-1 rounded-lg"
                              >
                                <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${attendanceState[s.id] === 'PRESENT' ? 'bg-emerald-50 border-emerald-200' : 'border-transparent hover:bg-slate-100'}`}>
                                  <RadioGroupItem value="PRESENT" id={`present-${s.id}`} className="text-emerald-600 border-emerald-600" />
                                  <Label htmlFor={`present-${s.id}`} className="cursor-pointer text-emerald-800 text-xs sm:text-sm font-medium">Present</Label>
                                </div>
                                <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${attendanceState[s.id] === 'ABSENT' ? 'bg-rose-50 border-rose-200' : 'border-transparent hover:bg-slate-100'}`}>
                                  <RadioGroupItem value="ABSENT" id={`absent-${s.id}`} className="text-rose-600 border-rose-600" />
                                  <Label htmlFor={`absent-${s.id}`} className="cursor-pointer text-rose-800 text-xs sm:text-sm font-medium">Absent</Label>
                                </div>
                                <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${attendanceState[s.id] === 'LEAVE' ? 'bg-amber-50 border-amber-200' : 'border-transparent hover:bg-slate-100'}`}>
                                  <RadioGroupItem value="LEAVE" id={`leave-${s.id}`} className="text-amber-600 border-amber-600" />
                                  <Label htmlFor={`leave-${s.id}`} className="cursor-pointer text-amber-800 text-xs sm:text-sm font-medium">Leave</Label>
                                </div>
                              </RadioGroup>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {students.length > 0 && (
                  <div className="p-4 sm:p-6 bg-slate-50 border-t flex justify-end">
                    <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-md w-full sm:w-auto" onClick={() => setConfirmOpen(true)}>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Submit Register
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-emerald-900">Confirm Submission</DialogTitle>
            <DialogDescription className="pt-3">
              You are marking attendance for <strong>Class {selectedClass}</strong> on <strong>{format(new Date(date), 'PP')}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-md text-amber-800 text-sm my-2">
            <strong>Warning:</strong> Once submitted, this register is locked and cannot be changed. Are you sure all entries are correct?
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Review Again</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Confirm & Lock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
