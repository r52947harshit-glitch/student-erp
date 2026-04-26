"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { format, isPast } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { useFileUpload } from "@/hooks/useFileUpload"
import { BookOpen, Calendar, Clock, FileText, Paperclip, UploadCloud } from "lucide-react"

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
    // Generate signed URLs if needed before showing details
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

    const url = isResubmit 
      ? `/api/assignments/${activeAssignment.id}/submit` 
      : `/api/assignments/${activeAssignment.id}/submit`
    
    // upload hook handles POST vs PATCH if we configure it, but our hook currently hardcodes POST.
    // Let's modify the hook url via manual fetch since hook is hardcoded to POST, or update hook to accept method.
    // Wait, useFileUpload uses XMLHttpRequest.open('POST', url). 
    // Actually, our API /api/assignments/[id]/submit handles POST for create and PATCH for update.
    // We can use query param or just use standard fetch if we change the API or hook.
    // Since useFileUpload is POST, let's use standard fetch for PATCH or fix useFileUpload.
    // Let's just use standard fetch for this MVP since fetch supports progress in next.js via streams, 
    // but the hook uses XHR for accurate tracking.
    // Actually, we can use the `upload` function and change the backend to accept POST for both 
    // if we add an `isUpdate` flag.
    // For now, let's just use the hook. Our backend PATCH route expects PATCH. 
    // Let's use `fetch` for PATCH to keep things simple, or XHR directly here for PATCH.
    
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
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-blue-900">My Assignments</h2>
          <p className="text-muted-foreground">View assignments and upload your submissions.</p>
        </div>
      </div>

      <Tabs defaultValue="assignments">
        <TabsList className="bg-blue-50 text-blue-800">
          <TabsTrigger value="assignments">All Assignments</TabsTrigger>
          <TabsTrigger value="submissions">My Submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="space-y-4 mt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-4 rounded-lg border shadow-sm">
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Subject" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Subjects</SelectItem>
                {subjects.map((s: any) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="NOT_SUBMITTED">Not Submitted</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="PENDING">Needs Revision</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center"><LoadingSpinner /></div>
          ) : filteredAssignments.length === 0 ? (
            <div className="text-center py-12 bg-white border rounded-lg text-muted-foreground">
              No assignments found.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredAssignments.map(a => {
                const pastDue = isPast(new Date(a.dueDate))
                const sub = a.mySubmission

                return (
                  <Card key={a.id} className="hover:shadow-md transition-shadow border-blue-100 flex flex-col">
                    <CardContent className="p-5 flex flex-col h-full">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex gap-2">
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">{a.subject}</span>
                        </div>
                        {sub ? (
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            sub.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            sub.status === 'PENDING' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {sub.status === 'PENDING' ? 'NEEDS REVISION' : sub.status} {sub.status !== 'PENDING' && '✓'}
                          </span>
                        ) : pastDue ? (
                          <span className="px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                            MISSED
                          </span>
                        ) : null}
                      </div>

                      <h3 className="font-bold text-lg leading-tight mb-2">{a.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{a.description}</p>
                      
                      <div className="space-y-3 mt-auto">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className={pastDue && !sub ? "text-red-600 font-medium" : "text-slate-600"}>
                            Due: {format(new Date(a.dueDate), 'dd MMM yyyy, p')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span>Posted by: {a.teacher?.user?.name}</span>
                        </div>

                        {sub && (
                          <div className="mt-4 p-3 bg-slate-50 border rounded-md text-sm">
                            <p className="font-semibold text-slate-700 text-xs mb-2">MY SUBMISSION</p>
                            <div className="flex items-center gap-2 text-blue-600 font-medium mb-1 truncate">
                              <Paperclip className="w-4 h-4 shrink-0" />
                              <span className="truncate">{sub.fileName}</span>
                            </div>
                            <p className="text-xs text-slate-500">Submitted on: {format(new Date(sub.submittedAt), 'PPp')}</p>
                            {sub.teacherNote && (
                              <div className="mt-2 text-sm bg-orange-50 text-orange-900 p-2 rounded border border-orange-100">
                                <strong>Teacher Note:</strong> {sub.teacherNote}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2 pt-4 mt-2">
                          <Button variant="outline" className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => openUploadModal(a, !!sub)}>
                            {sub ? "View Details" : "Submit Now"}
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
                      <th className="p-4 font-medium">Assignment</th>
                      <th className="p-4 font-medium">Subject</th>
                      <th className="p-4 font-medium">Submitted On</th>
                      <th className="p-4 font-medium">File Size</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Teacher Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submittedAssignments.map(a => {
                      const sub = a.mySubmission
                      if (!sub) return null
                      return (
                        <tr key={sub.id} className="border-b hover:bg-slate-50/50">
                          <td className="p-4 font-medium max-w-[200px] truncate">{a.title}</td>
                          <td className="p-4 text-slate-600">{a.subject}</td>
                          <td className="p-4 text-slate-600">{format(new Date(sub.submittedAt), 'PPp')}</td>
                          <td className="p-4 text-slate-600">{(sub.fileSize / 1024 / 1024).toFixed(2)} MB</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              sub.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' :
                              sub.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                            }`}>
                              {sub.status}
                            </span>
                          </td>
                          <td className="p-4 text-slate-600 italic text-xs max-w-[200px] truncate">
                            {sub.teacherNote || "-"}
                          </td>
                        </tr>
                      )
                    })}
                    {submittedAssignments.length === 0 && (
                      <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">No submissions found.</td></tr>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isResubmit ? "Update Submission" : "Submit Assignment"}</DialogTitle>
          </DialogHeader>
          
          {activeAssignment && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-slate-50 rounded border text-sm space-y-1">
                <p className="font-bold">{activeAssignment.title}</p>
                <p className="text-slate-600">Subject: {activeAssignment.subject} | Due: {format(new Date(activeAssignment.dueDate), 'PP')}</p>
                {activeAssignment.signedFileUrl && (
                  <a href={activeAssignment.signedFileUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 mt-2 inline-block">
                    <FileText className="w-4 h-4" /> Download Assignment File
                  </a>
                )}
              </div>

              {activeAssignment.mySubmission && (
                <div className="p-3 bg-blue-50 rounded border border-blue-100 text-sm">
                  <p className="font-bold text-blue-800 mb-1">Your current submission:</p>
                  <p className="truncate text-blue-600 mb-2">{activeAssignment.mySubmission.fileName}</p>
                  {activeAssignment.mySubmission.signedFileUrl && (
                    <a href={activeAssignment.mySubmission.signedFileUrl} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline text-xs">
                      Download my submission
                    </a>
                  )}
                </div>
              )}

              {(!activeAssignment.mySubmission || activeAssignment.mySubmission.status !== "COMPLETED") && !isPast(new Date(activeAssignment.dueDate)) && (
                <div className="border-2 border-dashed border-blue-200 rounded-lg p-6 bg-blue-50/50 text-center relative hover:bg-blue-50 transition-colors">
                  <Input 
                    type="file" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                  <UploadCloud className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <p className="font-medium text-blue-900 mb-1">
                    {uploadFile ? uploadFile.name : "Click or drag file to upload"}
                  </p>
                  <p className="text-xs text-blue-600">Max size: 50MB. Accepted: PDF, Word, Image, ZIP, Video, PPT, Excel</p>
                </div>
              )}

              {uploading && (
                <div className="space-y-2">
                  <div className="h-2 w-full bg-slate-100 rounded overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs text-center text-slate-500 font-medium">Uploading... {progress}%</p>
                  <p className="text-xs text-center text-orange-500">Please don't close this window.</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsUploadOpen(false)} disabled={uploading}>Cancel</Button>
                {(!activeAssignment.mySubmission || activeAssignment.mySubmission.status !== "COMPLETED") && !isPast(new Date(activeAssignment.dueDate)) && (
                  <Button onClick={handleUploadSubmit} disabled={uploading || !uploadFile} className="bg-blue-600 hover:bg-blue-700">
                    {isResubmit ? "Re-submit" : "Submit"} Assignment
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
