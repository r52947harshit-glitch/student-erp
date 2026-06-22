"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { format, isPast, isToday } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { useFileUpload } from "@/hooks/useFileUpload"
import { BookOpen, Calendar, Clock, FileText, Paperclip, UploadCloud, CheckCircle2, FileArchive, User } from "lucide-react"

export default function StudentAssignments() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const { upload, progress, uploading, error } = useFileUpload()

  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterSubject, setFilterSubject] = useState("ALL")
  const [filterStatus, setFilterStatus] = useState("ALL")

  // Modal States
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [activeAssignment, setActiveAssignment] = useState<any>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [isResubmit, setIsResubmit] = useState(false)

  useEffect(() => {
    loadAssignments()
  }, [])

  const loadAssignments = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/assignments`)
      const data = await res.json()
      setAssignments(data.assignments || [])
    } catch (e) {
      toast({ title: "Error", description: "Failed to load assignments", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const openUploadModal = async (assignment: any, resubmit = false) => {
    try {
      const res = await fetch(`/api/assignments/${assignment.id}`)
      const data = await res.json()
      setActiveAssignment(data)
      setIsResubmit(resubmit)
      setUploadFile(null)
      setIsUploadOpen(true)
    } catch (e) {
      toast({ title: "Error", description: "Failed to load assignment details", variant: "destructive" })
    }
  }

  const handleUploadSubmit = async () => {
    if (!uploadFile) {
      toast({ title: "Error", description: "Please select a file to upload", variant: "destructive" })
      return
    }

    const formData = new FormData()
    formData.append("file", uploadFile)

    let res: Response
    if (isResubmit) {
      res = await fetch(`/api/assignments/${activeAssignment.id}/submit`, {
        method: "PATCH",
        body: formData
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: "Error", description: data.error, variant: "destructive" })
        return
      }
    } else {
      const result = await upload(`/api/assignments/${activeAssignment.id}/submit`, formData)
      if (!result.success) {
        toast({ title: "Error", description: error || "Upload failed", variant: "destructive" })
        return
      }
    }

    toast({ title: "Success", description: "Assignment submitted successfully!" })
    setIsUploadOpen(false)
    loadAssignments()
  }

  // Derive unique subjects from assignments
  const subjects = Array.from(new Set(assignments.map(a => a.subject)))

  const filteredAssignments = assignments.filter(a => {
    const sMatch = filterSubject === "ALL" || a.subject === filterSubject
    let stMatch = true
    if (filterStatus === "NOT_SUBMITTED") stMatch = !a.mySubmission
    if (filterStatus === "SUBMITTED") stMatch = a.mySubmission?.status === "SUBMITTED"
    if (filterStatus === "COMPLETED") stMatch = a.mySubmission?.status === "COMPLETED"
    if (filterStatus === "PENDING") stMatch = a.mySubmission?.status === "PENDING"
    return sMatch && stMatch
  })

  const submittedAssignments = assignments.filter(a => !!a.mySubmission)

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      <PageHeader 
        title="My Assignments" 
        description="View your pending assignments, download materials, and upload your completed work."
      />

      <Tabs defaultValue="assignments" className="w-full">
        <TabsList className="grid w-full sm:w-auto grid-cols-2 mb-6 p-1 bg-blue-50 text-blue-800 border border-blue-100 rounded-lg">
          <TabsTrigger value="assignments" className="data-[state=active]:bg-white data-[state=active]:text-blue-900 data-[state=active]:shadow-sm rounded-md transition-all">All Assignments</TabsTrigger>
          <TabsTrigger value="submissions" className="data-[state=active]:bg-white data-[state=active]:text-blue-900 data-[state=active]:shadow-sm rounded-md transition-all">My Submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="space-y-6 mt-0">
          <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-4 w-full">
              <div className="space-y-1.5 w-full sm:w-auto">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Filter Subject</Label>
                <Select value={filterSubject} onValueChange={setFilterSubject}>
                  <SelectTrigger className="w-full sm:w-[180px] bg-slate-50 border-slate-200"><SelectValue placeholder="Subject" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Subjects</SelectItem>
                    {subjects.map((s: any) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 w-full sm:w-auto">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Filter Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-[180px] bg-slate-50 border-slate-200"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="NOT_SUBMITTED">Not Submitted</SelectItem>
                    <SelectItem value="SUBMITTED">Submitted</SelectItem>
                    <SelectItem value="PENDING">Needs Revision</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
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
                description={filterSubject === "ALL" && filterStatus === "ALL" ? "You have no assignments at the moment. Enjoy your free time!" : "No assignments match your current filters."}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssignments.map(a => {
                const pastDue = isPast(new Date(a.dueDate))
                const dueToday = isToday(new Date(a.dueDate))
                const sub = a.mySubmission

                return (
                  <Card key={a.id} className="hover:shadow-md transition-all duration-200 border-slate-200 overflow-hidden flex flex-col group hover:border-blue-200 bg-white">
                    <div className={`h-1.5 w-full ${sub?.status === 'COMPLETED' ? 'bg-emerald-500' : sub?.status === 'SUBMITTED' ? 'bg-blue-500' : pastDue ? 'bg-rose-500' : dueToday ? 'bg-amber-400' : 'bg-blue-300'}`} />
                    <CardContent className="p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-3 gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 tracking-wide uppercase">{a.subject}</span>
                        {sub ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border shrink-0 ${
                            sub.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            sub.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {sub.status === 'PENDING' ? 'REVISE' : sub.status} {sub.status !== 'PENDING' && '✓'}
                          </span>
                        ) : pastDue ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-rose-50 text-rose-700 border border-rose-200 shrink-0">MISSED</span>
                        ) : dueToday ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-amber-50 text-amber-700 border border-amber-200 shrink-0">DUE TODAY</span>
                        ) : null}
                      </div>

                      <h3 className="font-bold text-lg leading-tight mb-2 text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-2">{a.title}</h3>
                      <p className="text-sm text-slate-600 line-clamp-2 mb-4 leading-relaxed">{a.description}</p>
                      
                      <div className="mt-auto space-y-4">
                        <div className="flex flex-col gap-2 pt-1 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                          <div className="flex items-center gap-2.5 text-xs">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span className={pastDue && !sub ? "text-rose-600 font-bold" : dueToday && !sub ? "text-amber-600 font-bold" : "text-slate-600 font-medium"}>
                              Due: {format(new Date(a.dueDate), 'dd MMM yyyy, p')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5 text-xs text-slate-600 font-medium">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>By: {a.teacher?.user?.name}</span>
                          </div>
                        </div>

                        {sub && (
                          <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-sm">
                            <p className="font-bold text-blue-900 text-[10px] uppercase tracking-wider mb-2 flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> MY SUBMISSION</p>
                            <div className="flex items-center gap-2 text-blue-700 font-medium mb-1 truncate text-xs">
                              <FileArchive className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{sub.fileName}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium">On: {format(new Date(sub.submittedAt), 'PPp')}</p>
                            
                            {sub.teacherNote && (
                              <div className="mt-2.5 text-xs bg-amber-50 text-amber-900 p-2.5 rounded-md border border-amber-200 font-medium">
                                <span className="font-bold uppercase tracking-wider text-[10px] block mb-1">Feedback:</span> 
                                {sub.teacherNote}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2 pt-2 border-t border-slate-100">
                          <Button variant={sub ? "outline" : "default"} className={`flex-1 w-full ${!sub ? 'bg-blue-600 hover:bg-blue-700 shadow-sm' : 'border-blue-200 text-blue-700 hover:bg-blue-50'}`} onClick={() => openUploadModal(a, !!sub)}>
                            {sub ? "View / Edit" : "Submit Work"}
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
                      <th className="px-6 py-4">Assignment & Subject</th>
                      <th className="px-6 py-4">Submitted File</th>
                      <th className="px-6 py-4">Date & Time</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Feedback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {submittedAssignments.map(a => {
                      const sub = a.mySubmission
                      if (!sub) return null
                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col max-w-[250px]">
                              <span className="font-semibold text-slate-900 truncate" title={a.title}>{a.title}</span>
                              <span className="text-xs text-slate-500 mt-0.5 font-medium">{a.subject}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 max-w-[150px]">
                              <Paperclip className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span className="truncate text-blue-700 font-medium" title={sub.fileName}>{sub.fileName}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 mt-0.5 block">{(sub.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {format(new Date(sub.submittedAt), 'dd MMM, HH:mm')}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                              sub.status === 'SUBMITTED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              sub.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                              'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {sub.status === 'PENDING' ? 'REVISE' : sub.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {sub.teacherNote ? (
                              <span className="text-slate-600 italic text-xs max-w-[200px] truncate block bg-slate-50 px-2 py-1 rounded border border-slate-100" title={sub.teacherNote}>
                                "{sub.teacherNote}"
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    {submittedAssignments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center p-12">
                          <EmptyState 
                            icon={CheckCircle2}
                            title="No submissions yet"
                            description="You haven't submitted any assignments yet."
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* UPLOAD MODAL */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto w-full max-w-md mx-4 sm:mx-auto sm:rounded-xl">
          <DialogHeader className="pb-4 border-b border-slate-100">
            <DialogTitle className="text-xl text-blue-900">{isResubmit ? "Update Submission" : "Submit Assignment"}</DialogTitle>
            <DialogDescription>Upload your completed work file.</DialogDescription>
          </DialogHeader>
          
          {activeAssignment && (
            <div className="space-y-5 py-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm space-y-2">
                <p className="font-bold text-slate-900 text-base">{activeAssignment.title}</p>
                <div className="flex items-center gap-3 text-slate-600 font-medium text-xs">
                  <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700">{activeAssignment.subject}</span>
                  <span>Due: {format(new Date(activeAssignment.dueDate), 'PP')}</span>
                </div>
                {activeAssignment.signedFileUrl && (
                  <div className="pt-2 mt-2 border-t border-slate-200">
                    <a href={`/api/assignments/${activeAssignment.id}/download`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline bg-blue-50 px-3 py-1.5 rounded-md">
                      <FileText className="w-4 h-4" /> Download Reference File
                    </a>
                  </div>
                )}
              </div>

              {activeAssignment.mySubmission && (
                <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100 text-sm">
                  <p className="font-bold text-blue-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Current Submission
                  </p>
                  <p className="truncate text-blue-700 font-medium mb-3 flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-blue-500" /> {activeAssignment.mySubmission.fileName}
                  </p>
                  {activeAssignment.mySubmission.signedFileUrl && (
                    <a href={`/api/assignments/${activeAssignment.id}/submissions/${activeAssignment.mySubmission.id}/download`} target="_blank" rel="noreferrer" className="inline-block text-xs font-bold text-blue-600 bg-white border border-blue-200 px-3 py-1.5 rounded-md hover:bg-blue-50 transition-colors">
                      Download My File
                    </a>
                  )}
                </div>
              )}

              {(!activeAssignment.mySubmission || activeAssignment.mySubmission.status !== "COMPLETED") && !isPast(new Date(activeAssignment.dueDate)) && (
                <div className="border-2 border-dashed border-blue-200 rounded-xl p-8 bg-blue-50/30 text-center relative hover:bg-blue-50/80 hover:border-blue-300 transition-all group">
                  <Input 
                    type="file" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                  <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-8 h-8 text-blue-500" />
                  </div>
                  <p className="font-bold text-blue-900 mb-1 text-base">
                    {uploadFile ? uploadFile.name : "Click or drag file to upload"}
                  </p>
                  {uploadFile ? (
                    <p className="text-xs text-blue-600 font-medium bg-blue-100 inline-block px-2 py-0.5 rounded">Ready to submit</p>
                  ) : (
                    <p className="text-xs text-slate-500 font-medium">Max size: 50MB. (PDF, Word, Image, ZIP)</p>
                  )}
                </div>
              )}

              {uploading && (
                <div className="space-y-2 p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all duration-300 relative" style={{ width: `${progress}%` }}>
                      <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_1s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent translate-x-[-100%]" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs font-medium">
                    <span className="text-slate-500">Uploading file...</span>
                    <span className="text-blue-700">{progress}%</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="outline" onClick={() => setIsUploadOpen(false)} disabled={uploading} className="border-slate-200 hover:bg-slate-50 w-full sm:w-auto">Cancel</Button>
                {(!activeAssignment.mySubmission || activeAssignment.mySubmission.status !== "COMPLETED") && !isPast(new Date(activeAssignment.dueDate)) && (
                  <Button onClick={handleUploadSubmit} disabled={uploading || !uploadFile} className="bg-blue-600 hover:bg-blue-700 shadow-sm w-full sm:w-auto">
                    {isResubmit ? "Update Submission" : "Submit Assignment"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
