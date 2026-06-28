"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { format, isPast, isToday } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { DataBadge } from "@/components/shared/DataBadge"
import { BookOpen, Calendar, Clock, FileText, Paperclip, Plus, Trash2, Users, Download, MessageSquare, CheckCircle2, AlertCircle, Save } from "lucide-react"

export default function TeacherAssignments() {
  const { data: session } = useSession()
  const { toast } = useToast()

  const [classesData, setClassesData] = useState<{className: string, subjects: string[]}[]>([])
  
  // Tab 1 States
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterClass, setFilterClass] = useState("ALL")
  const [filterSubject, setFilterSubject] = useState("ALL")

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ title: "", description: "", className: "", subject: "", dueDate: "" })
  const [addFile, setAddFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Drawer States
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeAssignment, setActiveAssignment] = useState<any>(null)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})

  // Tab 2 States
  const [allSubmissions, setAllSubmissions] = useState<any[]>([])

  const [activeTab, setActiveTab] = useState("my_assignments")
  const [submissionsLoading, setSubmissionsLoading] = useState(false)

  useEffect(() => {
    fetch("/api/teacher/dashboard")
      .then(res => res.json())
      .then(d => {
        if (d.teacher?.assignedClasses) setClassesData(d.teacher.assignedClasses)
      })
    loadAssignments()
  }, [])

  const loadAssignments = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/assignments?limit=100`)
      const data = await res.json()
      const loadedAssignments = data.assignments || []
      setAssignments(loadedAssignments)
      
      if (activeTab === "submissions" && loadedAssignments.length > 0) {
        loadAllSubmissions(loadedAssignments)
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to load assignments", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const loadAllSubmissions = async (assignmentsList = assignments) => {
    if (assignmentsList.length === 0) return
    setSubmissionsLoading(true)
    try {
      const allSubs: any[] = []
      await Promise.all(
        assignmentsList.map(async (a: any) => {
          try {
            const sRes = await fetch(`/api/assignments/${a.id}/submissions`)
            const sData = await sRes.json()
            if (sData.submissions) {
              sData.submissions.forEach((sub: any) => {
                allSubs.push({ ...sub, assignment: a })
              })
            }
          } catch (e) {
            console.error(`Failed to fetch submissions for assignment ${a.id}`, e)
          }
        })
      )
      setAllSubmissions(
        allSubs.sort((x, y) => new Date(y.submittedAt).getTime() - new Date(x.submittedAt).getTime())
      )
    } catch (e) {
      toast({ title: "Error", description: "Failed to load student submissions", variant: "destructive" })
    } finally {
      setSubmissionsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === "submissions") {
      loadAllSubmissions()
    }
  }, [activeTab])

  const handlePostAssignment = async () => {
    if (!addForm.title || !addForm.className || !addForm.subject || !addForm.dueDate) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append("title", addForm.title)
      formData.append("description", addForm.description)
      formData.append("className", addForm.className)
      formData.append("subject", addForm.subject)
      formData.append("dueDate", new Date(addForm.dueDate).toISOString())
      if (addFile) formData.append("file", addFile)

      const res = await fetch("/api/assignments", { method: "POST", body: formData })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)
      
      toast({ title: "Success", description: "Assignment posted successfully!" })
      setIsAddOpen(false)
      setAddForm({ title: "", description: "", className: "", subject: "", dueDate: "" })
      setAddFile(null)
      loadAssignments()
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this assignment?")) return
    try {
      const res = await fetch(`/api/assignments/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: "Success", description: "Assignment deleted" })
      loadAssignments()
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    }
  }

  const openSubmissions = async (assignment: any) => {
    setActiveAssignment(assignment)
    setDrawerOpen(true)
    setDrawerLoading(true)
    try {
      const res = await fetch(`/api/assignments/${assignment.id}/submissions`)
      const data = await res.json()
      setSubmissions(data.submissions || [])
      const notes: Record<string, string> = {}
      ;(data.submissions || []).forEach((s: any) => {
        if (s.teacherNote) notes[s.id] = s.teacherNote
      })
      setReviewNotes(notes)
    } catch (e) {
      toast({ title: "Error", description: "Failed to load submissions", variant: "destructive" })
    } finally {
      setDrawerLoading(false)
    }
  }

  const handleReviewSubmission = async (submissionId: string, status: string) => {
    try {
      const note = reviewNotes[submissionId] || ""
      const res = await fetch(`/api/assignments/${activeAssignment.id}/submissions/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, teacherNote: note })
      })
      if (!res.ok) throw new Error()
      toast({ title: "Success", description: "Review saved" })
      
      // Update local state
      setSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, status, teacherNote: note } : s))
      setAllSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, status, teacherNote: note } : s))
    } catch (e) {
      toast({ title: "Error", description: "Failed to save review", variant: "destructive" })
    }
  }

  const filteredAssignments = assignments.filter(a => 
    (filterClass === "ALL" || a.className === filterClass) &&
    (filterSubject === "ALL" || a.subject === filterSubject)
  )

  const availableSubjects = filterClass === "ALL" 
    ? [] 
    : classesData.find(c => c.className === filterClass)?.subjects || []

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-7xl mx-auto">
      <PageHeader 
        title="Assignments" 
        description="Manage your class assignments, track due dates, and review student submissions."
        action={
          <Button onClick={() => setIsAddOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 shadow-md">
            <Plus className="w-4 h-4 mr-2" /> Create Assignment
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full sm:w-auto grid-cols-2 mb-6 p-1 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg">
          <TabsTrigger value="my_assignments" className="data-[state=active]:bg-white data-[state=active]:text-emerald-900 data-[state=active]:shadow-sm rounded-md transition-all">My Assignments</TabsTrigger>
          <TabsTrigger value="submissions" className="data-[state=active]:bg-white data-[state=active]:text-emerald-900 data-[state=active]:shadow-sm rounded-md transition-all">Student Submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="my_assignments" className="mt-0 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-4 w-full">
              <div className="space-y-1.5 w-full sm:w-auto">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Filter Class</Label>
                <Select value={filterClass} onValueChange={setFilterClass}>
                  <SelectTrigger className="w-full sm:w-[180px] bg-slate-50 border-slate-200"><SelectValue placeholder="All Classes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Classes</SelectItem>
                    {classesData.map(c => <SelectItem key={c.className} value={c.className}>Class {c.className}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 w-full sm:w-auto">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Filter Subject</Label>
                <Select value={filterSubject} onValueChange={setFilterSubject} disabled={filterClass === "ALL"}>
                  <SelectTrigger className="w-full sm:w-[180px] bg-slate-50 border-slate-200 disabled:opacity-50"><SelectValue placeholder="All Subjects" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Subjects</SelectItem>
                    {availableSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center"><LoadingSpinner /></div>
          ) : filteredAssignments.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-xl py-16 shadow-sm">
              <EmptyState 
                icon={BookOpen}
                title="No assignments found"
                description={filterClass === "ALL" ? "You haven't created any assignments yet." : "No assignments match your current filters."}
                action={{ label: "Create Assignment", onClick: () => setIsAddOpen(true) }}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssignments.map(a => {
                const pastDue = isPast(new Date(a.dueDate))
                const dueToday = isToday(new Date(a.dueDate))
                return (
                  <Card key={a.id} className="hover:shadow-md transition-all duration-200 border-slate-200 overflow-hidden flex flex-col group hover:border-emerald-200 bg-white">
                    <div className={`h-1.5 w-full ${pastDue ? 'bg-slate-300' : dueToday ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                    <CardContent className="p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-3 gap-2">
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 tracking-wide">{a.subject}</span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 tracking-wide">Class {a.className}</span>
                        </div>
                        {pastDue && <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold tracking-wider uppercase border border-slate-200 shrink-0">Closed</span>}
                        {dueToday && !pastDue && <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-bold tracking-wider uppercase border border-amber-200 shrink-0">Due Today</span>}
                      </div>
                      
                      <h3 className="font-bold text-lg leading-tight mb-2 text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2">{a.title}</h3>
                      <p className="text-sm text-slate-600 line-clamp-2 mb-5 leading-relaxed">{a.description}</p>
                      
                      <div className="mt-auto space-y-4">
                        {a.fileName && (
                          <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100/50 group/file hover:bg-blue-50 transition-colors">
                            <Paperclip className="w-4 h-4 shrink-0 text-blue-500" />
                            <span className="truncate font-medium">{a.fileName}</span>
                          </div>
                        )}
                        
                        <div className="flex flex-col gap-2 pt-1">
                          <div className="flex items-center gap-2.5 text-sm">
                            <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            </div>
                            <span className={pastDue ? "text-slate-500 line-through decoration-slate-300" : dueToday ? "text-amber-700 font-medium" : "text-slate-700 font-medium"}>
                              Due {format(new Date(a.dueDate), 'dd MMM yyyy, p')}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2.5 text-sm text-slate-600">
                            <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                              <Users className="w-3.5 h-3.5 text-emerald-600" />
                            </div>
                            <span><strong className="text-emerald-700">{a._count.submissions}</strong> Student Submissions</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-3 pt-4 border-t border-slate-100 mt-2">
                          <Button variant="outline" className="flex-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800" onClick={() => openSubmissions(a)}>
                            Review Work
                          </Button>
                          <Button variant="outline" size="icon" className="text-rose-500 border-rose-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 shrink-0" onClick={() => handleDelete(a.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="submissions" className="mt-0">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-6 py-4">Student</th>
                      <th className="px-6 py-4">Assignment Info</th>
                      <th className="px-6 py-4">Submitted On</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {submissionsLoading ? (
                      <tr>
                        <td colSpan={4} className="text-center p-12">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <LoadingSpinner />
                            <span className="text-sm text-slate-500 font-medium">Loading student submissions...</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <>
                        {allSubmissions.filter(s => s.status !== "PENDING_FAKE").map(sub => (
                          <tr key={sub.id} className="hover:bg-slate-50/60 cursor-pointer transition-colors" onClick={() => openSubmissions(sub.assignment)}>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-900">{sub.student.user.name}</span>
                                <span className="text-xs text-slate-500 mt-0.5">Roll {sub.student.rollNo}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col max-w-[250px]">
                                <span className="font-medium text-slate-900 truncate" title={sub.assignment.title}>{sub.assignment.title}</span>
                                <span className="text-xs text-slate-500 mt-0.5">Class {sub.assignment.className} • {sub.assignment.subject}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5 text-slate-600">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                {format(new Date(sub.submittedAt), 'PPp')}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <DataBadge status={sub.status} />
                            </td>
                          </tr>
                        ))}
                        {allSubmissions.length === 0 && (
                          <tr>
                            <td colSpan={4} className="text-center p-12">
                              <EmptyState 
                                icon={CheckCircle2}
                                title="No submissions yet"
                                description="Students have not submitted any assignments yet."
                              />
                            </td>
                          </tr>
                        )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ADD ASSIGNMENT MODAL */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto w-full max-w-xl sm:rounded-xl">
          <DialogHeader className="pb-4 border-b border-slate-100">
            <DialogTitle className="text-xl text-emerald-900">Post New Assignment</DialogTitle>
            <DialogDescription>Create an assignment for a specific class and subject.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-slate-700">Class <span className="text-rose-500">*</span></Label>
                <Select value={addForm.className} onValueChange={v => setAddForm({...addForm, className: v, subject: ""})}>
                  <SelectTrigger className="border-slate-200 focus:ring-emerald-500"><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {classesData.map(c => <SelectItem key={c.className} value={c.className}>Class {c.className}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Subject <span className="text-rose-500">*</span></Label>
                <Select value={addForm.subject} onValueChange={v => setAddForm({...addForm, subject: v})} disabled={!addForm.className}>
                  <SelectTrigger className="border-slate-200 focus:ring-emerald-500"><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {(classesData.find(c => c.className === addForm.className)?.subjects || []).map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-slate-700">Title <span className="text-rose-500">*</span></Label>
                <span className="text-xs text-slate-400 font-medium">{addForm.title.length}/200</span>
              </div>
              <Input 
                value={addForm.title} 
                onChange={e => setAddForm({...addForm, title: e.target.value})} 
                maxLength={200} 
                className="border-slate-200 focus-visible:ring-emerald-500 font-medium"
                placeholder="e.g. Chapter 3: Geometry Exercise"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-slate-700">Description <span className="text-rose-500">*</span></Label>
                <span className="text-xs text-slate-400 font-medium">{addForm.description.length}/1000</span>
              </div>
              <Textarea 
                value={addForm.description} 
                onChange={e => setAddForm({...addForm, description: e.target.value})} 
                className="min-h-[120px] resize-none border-slate-200 focus-visible:ring-emerald-500 leading-relaxed" 
                maxLength={1000} 
                placeholder="Provide detailed instructions for the assignment..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Due Date & Time <span className="text-rose-500">*</span></Label>
              <Input 
                type="datetime-local" 
                value={addForm.dueDate} 
                onChange={e => setAddForm({...addForm, dueDate: e.target.value})}
                className="border-slate-200 focus-visible:ring-emerald-500" 
              />
            </div>
            <div className="space-y-2 p-4 bg-slate-50 border border-slate-100 rounded-lg border-dashed">
              <Label className="text-slate-700 flex items-center gap-2 mb-2">
                <Paperclip className="w-4 h-4 text-slate-400" /> Reference File (Optional)
              </Label>
              <Input 
                type="file" 
                onChange={e => setAddFile(e.target.files?.[0] || null)}
                className="border-slate-200 file:bg-slate-100 file:text-slate-700 file:border-0 file:mr-4 file:px-4 file:py-1 file:rounded-full file:font-medium text-sm text-slate-600 focus-visible:ring-emerald-500 cursor-pointer"
              />
              <p className="text-xs text-slate-500 mt-2">Maximum file size: 10MB (PDF, JPG, PNG, DOCX)</p>
            </div>
          </div>
          <DialogFooter className="border-t border-slate-100 pt-4 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsAddOpen(false)} className="w-full sm:w-auto border-slate-200 hover:bg-slate-50">Cancel</Button>
            <Button onClick={handlePostAssignment} disabled={submitting} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 shadow-sm">
              {submitting ? (
                <>
                  <LoadingSpinner />
                  <span className="ml-2">Posting...</span>
                </>
              ) : (
                "Post Assignment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SUBMISSIONS DRAWER */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto sm:w-[500px] border-l-0 shadow-2xl p-0 flex flex-col">
          <SheetHeader className="p-6 bg-slate-50 border-b border-slate-200">
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 tracking-wide uppercase">{activeAssignment?.subject}</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800 border border-slate-300 tracking-wide uppercase">Class {activeAssignment?.className}</span>
            </div>
            <SheetTitle className="text-xl leading-tight text-slate-900">{activeAssignment?.title}</SheetTitle>
            <SheetDescription className="text-sm mt-1">Reviewing submissions for this assignment.</SheetDescription>
          </SheetHeader>

          {drawerLoading ? (
            <div className="flex justify-center flex-1 items-center p-12"><LoadingSpinner /></div>
          ) : (
            <div className="flex flex-col flex-1 bg-slate-50/50">
              <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 p-4">
                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                  {[
                    { id: "ALL", label: "All" },
                    { id: "SUBMITTED", label: "Pending Review" },
                    { id: "COMPLETED", label: "Graded" },
                    { id: "PENDING", label: "Needs Revise" }
                  ].map(s => (
                    <button 
                      key={s.id} 
                      onClick={() => setStatusFilter(s.id)}
                      className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-all ${statusFilter === s.id ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 space-y-4 flex-1">
                {submissions.filter(s => statusFilter === "ALL" || s.status === statusFilter).map(sub => (
                  <Card key={sub.id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                    <CardHeader className="p-4 pb-3 border-b border-slate-100 bg-white flex flex-row items-start justify-between gap-4 space-y-0">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-slate-900 text-base leading-none">{sub.student.user.name}</h4>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">R-{sub.student.rollNo}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                          <Clock className="w-3 h-3 text-slate-400" /> 
                          {format(new Date(sub.submittedAt), 'dd MMM, HH:mm')}
                        </div>
                      </div>
                      <a href={sub.fileUrl} target="_blank" rel="noreferrer" className="shrink-0">
                        <Button size="sm" variant="outline" className="h-8 border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800">
                          <Download className="w-3.5 h-3.5 mr-1.5" /> File
                        </Button>
                      </a>
                    </CardHeader>
                    
                    <CardContent className="p-4 bg-slate-50/50 space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Evaluation Status</Label>
                          <Select value={sub.status} onValueChange={(v) => handleReviewSubmission(sub.id, v)}>
                            <SelectTrigger className={`h-9 font-medium text-sm bg-white focus:ring-emerald-500 ${
                              sub.status === 'COMPLETED' ? 'border-emerald-200 text-emerald-800 focus:border-emerald-500' :
                              sub.status === 'PENDING' ? 'border-amber-200 text-amber-800 focus:border-amber-500' :
                              'border-blue-200 text-blue-800 focus:border-blue-500'
                            }`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SUBMITTED">Needs Review (Unread)</SelectItem>
                              <SelectItem value="COMPLETED">Accepted (Graded)</SelectItem>
                              <SelectItem value="PENDING">Return for Revision</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" /> Teacher Feedback
                          </Label>
                          <div className="flex gap-2">
                            <Textarea 
                              placeholder="Add comments, grades, or revision notes..." 
                              className="min-h-[80px] text-sm resize-none border-slate-200 focus-visible:ring-emerald-500 bg-white placeholder:text-slate-400 leading-relaxed" 
                              value={reviewNotes[sub.id] || ""} 
                              onChange={e => setReviewNotes({...reviewNotes, [sub.id]: e.target.value})} 
                            />
                          </div>
                          <div className="flex justify-end pt-1">
                            <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 shadow-sm" onClick={() => handleReviewSubmission(sub.id, sub.status)}>
                              <Save className="w-3.5 h-3.5 mr-1.5" /> Save Feedback
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {submissions.filter(s => statusFilter === "ALL" || s.status === statusFilter).length === 0 && (
                  <div className="text-center py-16 px-6 bg-white border border-dashed border-slate-200 rounded-xl">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <AlertCircle className="w-6 h-6 text-slate-400" />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900">No submissions found</h4>
                    <p className="text-xs text-slate-500 mt-1">There are no submissions matching the selected status filter.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
