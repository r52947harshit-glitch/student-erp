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
import { PageHeader } from "@/components/shared/PageHeader"
import { Save, AlertCircle, FileSpreadsheet, Users, Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { EmptyState } from "@/components/shared/EmptyState"

export default function EnterResults() {
  const { toast } = useToast()
  
  const [classesData, setClassesData] = useState<{className: string, subjects: string[]}[]>([])
  const [selectedClass, setSelectedClass] = useState("")
  const [examType, setExamType] = useState("")
  const [subject, setSubject] = useState("")

  const [students, setStudents] = useState<any[]>([])
  const [marksState, setMarksState] = useState<Record<string, { obtained: string, total: string, isExisting: boolean, editReason?: string }>>({})
  
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  const availableSubjects = classesData.find(c => c.className === selectedClass)?.subjects || []
  const EXAM_TYPES = ["UNIT_TEST", "HALF_YEARLY", "ANNUAL"]

  // Fetch classes
  useEffect(() => {
    fetch("/api/teacher/dashboard")
      .then(res => res.json())
      .then(d => {
        if (d.teacher?.assignedClasses) {
          setClassesData(d.teacher.assignedClasses)
        }
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

      if (m.isExisting && !m.editReason && o !== parseFloat(marksState[s.id].obtained)) {
         // this validation is simplistic since we don't track original explicitly in this state,
         // but if editReason is empty, backend or here we enforce it. We'll just enforce if m.isExisting.
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
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader 
        title="Enter Exam Results" 
        description="Input and update academic scores for your assigned classes and subjects."
      />
      
      <Card className="border-emerald-100 shadow-sm">
        <CardHeader className="bg-emerald-50/50 pb-4 border-b border-emerald-50">
          <CardTitle className="text-emerald-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            Results Data Grid
          </CardTitle>
          <CardDescription>Select class, exam type, and subject to begin data entry.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-6">
          <div className="p-4 sm:p-0 grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <Label className="text-slate-600">Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="bg-white border-emerald-100 focus:ring-emerald-500"><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classesData.map(c => (
                    <SelectItem key={c.className} value={c.className}>Class {c.className}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-600">Exam Type</Label>
              <Select value={examType} onValueChange={setExamType}>
                <SelectTrigger className="bg-white border-emerald-100 focus:ring-emerald-500"><SelectValue placeholder="Select exam" /></SelectTrigger>
                <SelectContent>
                  {EXAM_TYPES.map(e => (
                    <SelectItem key={e} value={e}>{e.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-600">Subject</Label>
              <Select value={subject} onValueChange={setSubject} disabled={!selectedClass}>
                <SelectTrigger className="bg-white border-emerald-100 focus:ring-emerald-500"><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {availableSubjects.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="sm:border sm:rounded-md overflow-hidden">
            {!selectedClass || !examType || !subject ? (
              <div className="p-12">
                <EmptyState 
                  icon={FileSpreadsheet}
                  title="Select filters to load grid"
                  description="Choose a class, exam type, and subject from the dropdowns above to start entering marks."
                />
              </div>
            ) : loading ? (
              <div className="p-16 flex justify-center"><LoadingSpinner /></div>
            ) : (
              <div className="space-y-0">
                <div className="p-4 sm:p-4 bg-amber-50 border-b border-amber-100 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-amber-900">Modification Rules</h4>
                    <p className="text-sm text-amber-800 mt-1">Changing existing scores requires submitting a brief Modification Reason which is immediately logged in the Audit system.</p>
                  </div>
                </div>

                <div className="overflow-x-auto bg-white">
                  <Table className="min-w-[800px]">
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="w-[100px]">Roll No</TableHead>
                        <TableHead className="w-[200px]">Student Name</TableHead>
                        <TableHead className="w-[150px]">Obtained Marks</TableHead>
                        <TableHead className="w-[150px]">Total Marks</TableHead>
                        <TableHead>Edit Logs / Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12">
                            <EmptyState 
                              icon={Users}
                              title="No active students"
                              description={`There are no active students in Class ${selectedClass}.`}
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        students.map(s => {
                          const m = marksState[s.id]
                          const isInvalid = m.obtained && (parseFloat(m.obtained) < 0 || parseFloat(m.obtained) > parseFloat(m.total))
                          
                          return (
                            <TableRow key={s.id} className={`hover:bg-slate-50 transition-colors ${m.isExisting ? "bg-emerald-50/20" : ""}`}>
                              <TableCell className="font-medium text-slate-600">{s.rollNo}</TableCell>
                              <TableCell>
                                <div className="font-semibold text-slate-900">{s.user.name}</div>
                                {m.isExisting && <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded uppercase tracking-wider"><Save className="w-3 h-3" /> Stored</span>}
                              </TableCell>
                              <TableCell>
                                <Input 
                                  type="number" 
                                  value={m.obtained}
                                  placeholder="0"
                                  className={`h-9 bg-white focus-visible:ring-emerald-500 ${isInvalid ? "border-red-500 focus-visible:ring-red-500 bg-red-50" : "border-slate-200"}`}
                                  onChange={e => handleUpdateMark(s.id, "obtained", e.target.value)}
                                />
                                {isInvalid && <p className="text-[10px] text-red-600 mt-1 absolute">Invalid marks</p>}
                              </TableCell>
                              <TableCell>
                                <Input 
                                  type="number" 
                                  value={m.total} 
                                  className="h-9 bg-white border-slate-200 focus-visible:ring-emerald-500"
                                  onChange={e => handleUpdateMark(s.id, "total", e.target.value)}
                                />
                              </TableCell>
                              <TableCell>
                                {m.isExisting ? (
                                  <Input 
                                    placeholder="Required reason for change..." 
                                    value={m.editReason || ""} 
                                    onChange={e => handleUpdateMark(s.id, "editReason", e.target.value)}
                                    className={`h-9 bg-white ${!m.editReason && m.obtained !== "" ? "border-amber-300 focus-visible:ring-amber-500" : "border-slate-200 focus-visible:ring-emerald-500"}`}
                                  />
                                ) : (
                                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground italic bg-slate-50 px-2 py-1.5 rounded w-max">
                                    <Info className="w-3.5 h-3.5" /> New Entry
                                  </span>
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
                  <div className="p-4 sm:p-6 bg-slate-50 border-t flex justify-end">
                    <Button onClick={handleSaveAll} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto shadow-md">
                      <Save className="w-4 h-4 mr-2" />
                      {submitting ? "Saving..." : "Save Data Grid"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
