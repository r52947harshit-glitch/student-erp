"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2, CheckCircle2 } from "lucide-react"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"

export default function MarkAttendance() {
  const { toast } = useToast()
  
  const [classes, setClasses] = useState<string[]>([])
  const [selectedClass, setSelectedClass] = useState("")
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [maxDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const [students, setStudents] = useState<any[]>([])
  const [attendanceState, setAttendanceState] = useState<Record<string, string>>({})
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submittedRecords, setSubmittedRecords] = useState<any[]>([])
  
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // 1. Fetch assigned classes
  useEffect(() => {
    fetch("/api/teacher/dashboard")
      .then(res => res.json())
      .then(d => {
        if (d.teacher?.assignedClasses) {
          setClasses(d.teacher.assignedClasses)
          if (d.teacher.assignedClasses.length > 0) setSelectedClass(d.teacher.assignedClasses[0])
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

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight text-emerald-900">Mark Attendance</h2>
      
      <Card className="border-emerald-100">
        <CardHeader className="bg-emerald-50/50">
          <CardTitle>Attendance Register</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Select Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose your class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c} value={c}>Class {c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input 
                type="date" 
                value={date} 
                max={maxDate} 
                onChange={(e) => setDate(e.target.value)} 
              />
            </div>
          </div>

          <div className="border rounded-md">
            {loading ? (
              <div className="p-8 flex justify-center"><LoadingSpinner /></div>
            ) : isSubmitted ? (
              <div className="p-0">
                <div className="bg-emerald-100/50 p-4 border-b border-emerald-100 flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 className="w-5 h-5" />
                  <strong>Attendance Submitted</strong> for Class {selectedClass} on {format(new Date(date), 'PP')}. Read-only view enabled.
                </div>
                <Table>
                  <TableHeader>
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
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            r.status === 'PRESENT' ? 'bg-green-100 text-green-800' :
                            r.status === 'ABSENT' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                          }`}>
                            {r.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center p-4 bg-slate-50 border-b">
                  <span className="text-sm text-muted-foreground font-medium">Tracking {students.length} students</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleMarkAll("PRESENT")}>Mark All Present</Button>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Roll No</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Status Toggle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-6">No students found in this class.</TableCell>
                      </TableRow>
                    ) : (
                      students.map(s => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.rollNo}</TableCell>
                          <TableCell>{s.user.name}</TableCell>
                          <TableCell>
                            <RadioGroup 
                              value={attendanceState[s.id]} 
                              onValueChange={(val) => setAttendanceState({...attendanceState, [s.id]: val})}
                              className="flex gap-4"
                            >
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="PRESENT" id={`present-${s.id}`} />
                                <Label htmlFor={`present-${s.id}`} className="cursor-pointer text-green-700">Present</Label>
                              </div>
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="ABSENT" id={`absent-${s.id}`} />
                                <Label htmlFor={`absent-${s.id}`} className="cursor-pointer text-red-700">Absent</Label>
                              </div>
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="LEAVE" id={`leave-${s.id}`} />
                                <Label htmlFor={`leave-${s.id}`} className="cursor-pointer text-orange-700">Leave</Label>
                              </div>
                            </RadioGroup>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                
                {students.length > 0 && (
                  <div className="p-4 bg-slate-50 border-t flex justify-end">
                    <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setConfirmOpen(true)}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Submission</DialogTitle>
            <DialogDescription>
              You are marking attendance for <strong>Class {selectedClass}</strong> on <strong>{format(new Date(date), 'PP')}</strong>. 
              Once submitted, this array is locked locally and cannot be manipulated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Confirm & Lock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
