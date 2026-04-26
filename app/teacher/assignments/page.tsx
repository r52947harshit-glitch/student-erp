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
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { BookOpen, Calendar, Clock, FileText, Paperclip, Plus, Search, Trash2, Users } from "lucide-react"

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
      setAssignments(data.assignments || [])
      
      // Load all submissions for Tab 2
      if (data.assignments?.length > 0) {
        const allSubs: any[] = []
        for (const a of data.assignments) {
          const sRes = await fetch(`/api/assignments/${a.id}/submissions`)
          const sData = await sRes.json()
          if (sData.submissions) {
             sData.submissions.forEach((sub: any) => allSubs.push({ ...sub, assignment: a }))
          }
        }
        setAllSubmissions(allSubs.sort((x, y) => new Date(y.submittedAt).getTime() - new Date(x.submittedAt).getTime()))
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to load assignments", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

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
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-emerald-900">Assignments</h2>
          <p className="text-muted-foreground">Manage your assignments and review student submissions.</p>
        </div>
      </div>

      <Tabs defaultValue="my_assignments">
        <TabsList className="bg-emerald-50 text-emerald-800">
          <TabsTrigger value="my_assignments">My Assignments</TabsTrigger>
          <TabsTrigger value="submissions">Student Submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="my_assignments" className="space-y-4 mt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
            <div className="flex gap-4">
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Class" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Classes</SelectItem>
                  {classesData.map(c => <SelectItem key={c.className} value={c.className}>Class {c.className}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterSubject} onValueChange={setFilterSubject} disabled={filterClass === "ALL"}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Subject" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Subjects</SelectItem>
                  {availableSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setIsAddOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" /> Add Assignment
            </Button>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center"><LoadingSpinner /></div>
          ) : filteredAssignments.length === 0 ? (
            <div className="text-center py-12 bg-white border rounded-lg text-muted-foreground">
              No assignments found matching your filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssignments.map(a => {
                const pastDue = isPast(new Date(a.dueDate))
                const dueToday = isToday(new Date(a.dueDate))
                return (
                  <Card key={a.id} className="hover:shadow-md transition-shadow border-emerald-100 overflow-hidden flex flex-col">
                    <div className="h-2 w-full bg-emerald-500" />
                    <CardContent className="p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex gap-2">
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">{a.subject}</span>
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800">Class {a.className}</span>
                        </div>
                      </div>
                      <h3 className="font-bold text-lg leading-tight mb-2 line-clamp-2">{a.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{a.description}</p>
                      
                      <div className="mt-auto space-y-3">
                        {a.fileName && (
                          <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded">
                            <Paperclip className="w-4 h-4" />
                            <span className="truncate">{a.fileName}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className={pastDue ? "text-red-600 font-medium" : dueToday ? "text-orange-600 font-medium" : "text-slate-600"}>
                            Due: {format(new Date(a.dueDate), 'dd MMM yyyy, p')}
                            {pastDue && <span className="ml-2 px-1.5 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold tracking-wider uppercase">Closed</span>}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Users className="w-4 h-4 text-slate-400" />
                          <span>Submissions: <strong className="text-emerald-700">{a._count.submissions}</strong></span>
                        </div>
                        
                        <div className="flex gap-2 pt-2 border-t mt-4">
                          <Button variant="outline" size="sm" className="flex-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => openSubmissions(a)}>
                            View Submissions
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={() => handleDelete(a.id)}>
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

        <TabsContent value="submissions" className="mt-6">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b text-slate-600">
                    <tr>
                      <th className="p-4 font-medium">Student</th>
                      <th className="p-4 font-medium">Assignment</th>
                      <th className="p-4 font-medium">Class/Subject</th>
                      <th className="p-4 font-medium">Submitted On</th>
                      <th className="p-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allSubmissions.filter(s => s.status !== "PENDING_FAKE").map(sub => (
                      <tr key={sub.id} className="border-b hover:bg-slate-50/50 cursor-pointer" onClick={() => openSubmissions(sub.assignment)}>
                        <td className="p-4">
                          <p className="font-semibold">{sub.student.user.name}</p>
                          <p className="text-xs text-muted-foreground">Roll: {sub.student.rollNo}</p>
                        </td>
                        <td className="p-4 font-medium max-w-[200px] truncate">{sub.assignment.title}</td>
                        <td className="p-4">
                          <span className="block text-xs font-bold text-slate-500">Class {sub.assignment.className}</span>
                          <span className="block text-xs">{sub.assignment.subject}</span>
                        </td>
                        <td className="p-4 text-slate-600">{format(new Date(sub.submittedAt), 'PPp')}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            sub.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' :
                            sub.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                          }`}>
                            {sub.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {allSubmissions.length === 0 && (
                      <tr><td colSpan={5} className="text-center p-8 text-muted-foreground">No submissions found.</td></tr>
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Post New Assignment</DialogTitle>
            <DialogDescription>Create an assignment for a specific class and subject.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={addForm.className} onValueChange={v => setAddForm({...addForm, className: v, subject: ""})}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {classesData.map(c => <SelectItem key={c.className} value={c.className}>Class {c.className}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={addForm.subject} onValueChange={v => setAddForm({...addForm, subject: v})} disabled={!addForm.className}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {(classesData.find(c => c.className === addForm.className)?.subjects || []).map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={addForm.title} onChange={e => setAddForm({...addForm, title: e.target.value})} maxLength={200} />
              <div className="text-xs text-right text-muted-foreground">{addForm.title.length}/200</div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={addForm.description} onChange={e => setAddForm({...addForm, description: e.target.value})} className="h-24" maxLength={1000} />
              <div className="text-xs text-right text-muted-foreground">{addForm.description.length}/1000</div>
            </div>
            <div className="space-y-2">
              <Label>Due Date & Time</Label>
              <Input type="datetime-local" value={addForm.dueDate} onChange={e => setAddForm({...addForm, dueDate: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Attachment (Optional, max 10MB)</Label>
              <Input type="file" onChange={e => setAddFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handlePostAssignment} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting ? "Posting..." : "Post Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SUBMISSIONS DRAWER */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto sm:w-[600px]">
          <SheetHeader className="mb-6 border-b pb-4">
            <SheetTitle>Submissions: {activeAssignment?.title}</SheetTitle>
            <p className="text-sm text-muted-foreground">Class {activeAssignment?.className} • {activeAssignment?.subject}</p>
          </SheetHeader>

          {drawerLoading ? (
             <div className="flex justify-center p-12"><LoadingSpinner /></div>
          ) : (
             <div className="space-y-6">
               <div className="flex gap-2 p-1 bg-slate-100 rounded-md">
                 {["ALL", "SUBMITTED", "PENDING", "COMPLETED"].map(s => (
                   <button 
                     key={s} 
                     onClick={() => setStatusFilter(s)}
                     className={`flex-1 py-1.5 text-xs font-medium rounded ${statusFilter === s ? 'bg-white shadow' : 'text-slate-500 hover:text-slate-900'}`}
                   >
                     {s}
                   </button>
                 ))}
               </div>

               <div className="space-y-4">
                 {submissions.filter(s => statusFilter === "ALL" || s.status === statusFilter).map(sub => (
                   <div key={sub.id} className="p-4 border rounded-lg bg-slate-50 shadow-sm relative">
                     <div className="flex justify-between items-start mb-3">
                       <div>
                         <h4 className="font-bold flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${sub.status === 'COMPLETED' ? 'bg-green-500' : sub.status === 'SUBMITTED' ? 'bg-blue-500' : 'bg-orange-500'}`} />
                           {sub.student.user.name} <span className="text-xs text-muted-foreground font-normal">(Roll {sub.student.rollNo})</span>
                         </h4>
                         <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                           <Clock className="w-3 h-3" /> Submitted: {format(new Date(sub.submittedAt), 'PPp')}
                         </p>
                       </div>
                       <a href={sub.fileUrl} target="_blank" rel="noreferrer">
                         <Button size="sm" variant="outline" className="h-8 border-blue-200 text-blue-700 hover:bg-blue-50">
                           <FileText className="w-4 h-4 mr-1.5" /> Download
                         </Button>
                       </a>
                     </div>
                     
                     <div className="bg-white p-3 rounded border border-slate-200 grid gap-3 mt-3">
                       <div className="grid grid-cols-2 gap-3">
                         <div className="space-y-1">
                           <Label className="text-xs text-slate-500">Status Update</Label>
                           <Select value={sub.status} onValueChange={(v) => handleReviewSubmission(sub.id, v)}>
                             <SelectTrigger className="h-8 text-xs">
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="SUBMITTED">Submitted</SelectItem>
                               <SelectItem value="PENDING">Needs Revision</SelectItem>
                               <SelectItem value="COMPLETED">Accepted</SelectItem>
                             </SelectContent>
                           </Select>
                         </div>
                         <div className="space-y-1">
                           <Label className="text-xs text-slate-500">Add Feedback Note</Label>
                           <div className="flex gap-2">
                             <Input 
                               placeholder="Good work..." 
                               className="h-8 text-xs" 
                               value={reviewNotes[sub.id] || ""} 
                               onChange={e => setReviewNotes({...reviewNotes, [sub.id]: e.target.value})} 
                             />
                             <Button size="sm" className="h-8 bg-slate-800" onClick={() => handleReviewSubmission(sub.id, sub.status)}>Save</Button>
                           </div>
                         </div>
                       </div>
                     </div>
                   </div>
                 ))}
                 
                 {submissions.filter(s => statusFilter === "ALL" || s.status === statusFilter).length === 0 && (
                   <div className="text-center p-8 text-muted-foreground border border-dashed rounded-lg">
                     No submissions in this category.
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
