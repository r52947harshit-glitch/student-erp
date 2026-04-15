"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { Save, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function EnterResults() {
  const { toast } = useToast()
  
  const [classes, setClasses] = useState<string[]>([])
  const [selectedClass, setSelectedClass] = useState("")
  const [examType, setExamType] = useState("")
  const [subject, setSubject] = useState("")

  const [students, setStudents] = useState<any[]>([])
  const [marksState, setMarksState] = useState<Record<string, { obtained: string, total: string, isExisting: boolean, editReason?: string }>>({})
  
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  const SUBJECTS = ["Math", "Science", "English", "History", "Geography"]
  const EXAM_TYPES = ["UNIT_TEST", "HALF_YEARLY", "ANNUAL"]

  // Fetch classes
  useEffect(() => {
    fetch("/api/teacher/dashboard")
      .then(res => res.json())
      .then(d => {
        if (d.teacher?.assignedClasses) setClasses(d.teacher.assignedClasses)
      })
  }, [])

  // Fetch matrix when all 3 filters are selected
  useEffect(() => {
    if (selectedClass && examType && subject) {
      loadGrid()
    }
  }, [selectedClass, examType, subject])

  const loadGrid = async () => {
    setLoading(true)
    try {
      const [stRes, marksRes] = await Promise.all([
        fetch(`/api/attendance/students?class=${selectedClass}`),
        fetch(`/api/results?class=${selectedClass}&examType=${examType}&subject=${subject}`)
      ])
      
      const stData = await stRes.json()
      const marksData: any[] = await marksRes.json()

      const stateMap: Record<string, any> = {}
      stData.forEach((s: any) => {
        const found = marksData.find(m => m.studentId === s.id)
        if (found) {
          stateMap[s.id] = { obtained: found.marksObtained.toString(), total: found.totalMarks.toString(), isExisting: true, editReason: "" }
        } else {
          stateMap[s.id] = { obtained: "", total: "100", isExisting: false }
        }
      })

      setStudents(stData)
      setMarksState(stateMap)
    } catch (e) {
      toast({ title: "Error", description: "Failed to load grid.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateMark = (id: string, field: "obtained"|"total"|"editReason", value: string) => {
    setMarksState(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }))
  }

  const handleSaveAll = async () => {
    // Validation loop
    const payload = []
    for (const s of students) {
      const m = marksState[s.id]
      if (m.obtained === "") continue // skip empty rows

      const o = parseFloat(m.obtained)
      const t = parseFloat(m.total)

      if (isNaN(o) || isNaN(t) || o < 0 || t < 0 || o > t) {
         toast({ title: "Validation Error", description: `Invalid marks for Roll No ${s.rollNo}. Cannot be negative or exceed total.`, variant: "destructive" })
         return
      }

      if (m.isExisting && !m.editReason) {
         toast({ title: "Validation Error", description: `Reason required for editing existing generic marks for Roll No ${s.rollNo}.`, variant: "destructive" })
         return
      }

      payload.push({
         studentId: s.id,
         subject,
         examType,
         marksObtained: o,
         totalMarks: t,
         editReason: m.editReason
      })
    }

    if (payload.length === 0) {
      toast({ title: "Notice", description: "No marks entered to save." })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/results/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast({ 
        title: "Success", 
        description: `Results grid synchronized successfully. Created: ${data.createdCount}, Updated: ${data.updatedCount}.` 
      })
      loadGrid() // refresh marks grid to lock states
    } catch(e) {
      toast({ title: "Error", description: "Failed to save results.", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight text-emerald-900">Enter Exam Results</h2>
      
      <Card className="border-emerald-100">
        <CardHeader className="bg-emerald-50/50">
          <CardTitle>Results Data Grid</CardTitle>
          <CardDescription>Target isolated sections to submit batch academic scores.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c} value={c}>Class {c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Exam Type</Label>
              <Select value={examType} onValueChange={setExamType}>
                <SelectTrigger><SelectValue placeholder="Select exam" /></SelectTrigger>
                <SelectContent>
                  {EXAM_TYPES.map(e => (
                    <SelectItem key={e} value={e}>{e.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!selectedClass || !examType || !subject ? (
            <div className="p-8 text-center text-muted-foreground border rounded-md">
              Please select all filters to load the student grid.
            </div>
          ) : loading ? (
            <div className="p-8 flex justify-center border rounded-md"><LoadingSpinner /></div>
          ) : (
            <div className="space-y-4">
              <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Changing existing scores requires submitting a brief Modification Reason which is piped immediately into Audit tracking.
                </AlertDescription>
              </Alert>

              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Roll No</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead className="w-[150px]">Obtained Marks</TableHead>
                      <TableHead className="w-[150px]">Total Marks</TableHead>
                      <TableHead>Edit Logs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-6">No active students.</TableCell></TableRow>
                    ) : (
                      students.map(s => {
                        const m = marksState[s.id]
                        const isInvalid = m.obtained && (parseFloat(m.obtained) < 0 || parseFloat(m.obtained) > parseFloat(m.total))
                        
                        return (
                          <TableRow key={s.id} className={m.isExisting ? "bg-emerald-50/30" : ""}>
                            <TableCell className="font-medium">{s.rollNo}</TableCell>
                            <TableCell>
                              {s.user.name}
                              {m.isExisting && <span className="ml-2 text-[10px] text-emerald-600 font-bold bg-emerald-100 px-1 rounded">STORED</span>}
                            </TableCell>
                            <TableCell>
                              <Input 
                                type="number" 
                                value={m.obtained}
                                className={isInvalid ? "border-red-500" : ""}
                                onChange={e => handleUpdateMark(s.id, "obtained", e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <Input 
                                type="number" 
                                value={m.total} 
                                onChange={e => handleUpdateMark(s.id, "total", e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              {m.isExisting ? (
                                <Input 
                                  placeholder="Reason for change..." 
                                  value={m.editReason} 
                                  onChange={e => handleUpdateMark(s.id, "editReason", e.target.value)}
                                  className={!m.editReason && m.obtained !== "" ? "border-orange-300" : ""}
                                />
                              ) : (
                                <span className="text-xs text-muted-foreground italic">New Entry</span>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {students.length > 0 && (
                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveAll} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
                    <Save className="w-4 h-4 mr-2" />
                    Save Grid
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
