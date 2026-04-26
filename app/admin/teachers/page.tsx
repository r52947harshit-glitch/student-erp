"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { Search, Plus, Edit, UserX, UserCheck } from "lucide-react"
import { CLASS_LIST, SUBJECT_LIST, QUALIFICATION_LIST } from "@/lib/constants"
import { Checkbox } from "@/components/ui/checkbox"

export default function ManageTeachers() {
  const [teachers, setTeachers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState("ALL")
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [modalStep, setModalStep] = useState(1) // 1: Basic Info, 2: Assign Classes
  
  // Form State
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    qualification: "",
    joiningDate: "",
    assignedClasses: [] as { className: string; subjects: string[] }[],
  })
  
  // Credentials Display
  const [credentials, setCredentials] = useState<{email: string, tempPassword: string, employeeId: string} | null>(null)

  const { toast } = useToast()

  const fetchTeachers = async () => {
    setLoading(true)
    try {
      const url = new URL("/api/teachers", window.location.origin)
      if (search) url.searchParams.set("search", search)
        
      const res = await fetch(url.toString())
      const data = await res.json()
      setTeachers(data.teachers || [])
      setCurrentPage(1)
    } catch (e) {
      toast({ title: "Error", description: "Failed to fetch teachers", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchTeachers()
    }, 500)
    return () => clearTimeout(delayDebounce)
  }, [search])

  const openAddModal = () => {
    setIsEditing(false)
    setModalStep(1)
    setFormData({
      id: "", name: "", email: "", phone: "", address: "", qualification: "", joiningDate: "", assignedClasses: []
    })
    setCredentials(null)
    setIsModalOpen(true)
  }

  const openEditModal = (teacher: any) => {
    setIsEditing(true)
    setModalStep(1)
    setFormData({
      id: teacher.id,
      name: teacher.user.name,
      email: teacher.user.email,
      phone: teacher.phone,
      address: teacher.address,
      qualification: teacher.qualification,
      joiningDate: teacher.joiningDate.split('T')[0],
      assignedClasses: teacher.assignedClasses.map((ac: any) => ({
        className: ac.className,
        subjects: ac.subjects
      })),
    })
    setCredentials(null)
    setIsModalOpen(true)
  }

  const handleDeactivate = async (id: string, currentStatus: boolean) => {
    const action = currentStatus ? "deactivate" : "reactivate"
    if (!confirm(`Are you sure you want to ${action} this teacher?`)) return
    try {
      const res = await fetch(`/api/teachers/${id}/${action}`, { method: 'PATCH' })
      if (!res.ok) throw new Error()
      toast({ title: "Success", description: `Teacher ${action}d.` })
      fetchTeachers()
    } catch (e) {
      toast({ title: "Error", description: `Failed to ${action}`, variant: "destructive" })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check validation for Step 2
    if (formData.assignedClasses.length === 0) {
      toast({ title: "Validation Error", description: "Please assign at least one class.", variant: "destructive" })
      return
    }
    const invalidClass = formData.assignedClasses.find(ac => ac.subjects.length === 0)
    if (invalidClass) {
      toast({ title: "Validation Error", description: `Please select at least one subject for Class ${invalidClass.className}`, variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const endpoint = isEditing ? `/api/teachers/${formData.id}` : `/api/teachers`
      const method = isEditing ? `PUT` : `POST`

      const payload = { ...formData }
      if (isEditing) {
        // @ts-ignore
        delete payload.email // Email shouldn't be updated
      }

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      const result = await res.json()
      
      if (!res.ok) throw new Error(result.error)
      
      toast({ title: "Success", description: isEditing ? "Teacher updated" : "Teacher added successfully" })
      
      if (!isEditing && result.credentials) {
        setCredentials({ ...result.credentials, employeeId: result.teacher.employeeId })
        fetchTeachers()
      } else {
        setIsModalOpen(false)
        fetchTeachers()
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleClassToggle = (className: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({ ...prev, assignedClasses: [...prev.assignedClasses, { className, subjects: [] }] }))
    } else {
      setFormData(prev => ({ ...prev, assignedClasses: prev.assignedClasses.filter(ac => ac.className !== className) }))
    }
  }

  const handleSubjectToggle = (className: string, subject: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      assignedClasses: prev.assignedClasses.map(ac => {
        if (ac.className === className) {
          if (checked) return { ...ac, subjects: [...ac.subjects, subject] }
          else return { ...ac, subjects: ac.subjects.filter(s => s !== subject) }
        }
        return ac
      })
    }))
  }

  const handleSelectAllSubjects = (className: string) => {
    setFormData(prev => ({
      ...prev,
      assignedClasses: prev.assignedClasses.map(ac => {
        if (ac.className === className) {
          return { ...ac, subjects: [...SUBJECT_LIST] }
        }
        return ac
      })
    }))
  }

  // Filter local teachers array if active/inactive selected
  const filteredTeachers = teachers.filter(t => {
    if (filterStatus === "ALL") return true
    if (filterStatus === "ACTIVE") return t.user.isActive
    if (filterStatus === "INACTIVE") return !t.user.isActive
    return true
  })

  const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage)
  const paginatedTeachers = filteredTeachers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Manage Teachers</h2>
        <div className="flex gap-2">
          <Button onClick={openAddModal}>
            <Plus className="mr-2 h-4 w-4" /> Add Teacher
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search name or employee ID..."
                className="w-full pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full md:w-48">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <LoadingSpinner /> : (
            <div className="space-y-4">
              <div className="border rounded-md overflow-x-auto">
                <Table className="min-w-[900px]">
                  <TableHeader>
                  <TableRow>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Classes Assigned</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No teachers found.</TableCell>
                    </TableRow>
                  ) : (
                    paginatedTeachers.map(teacher => (
                      <TableRow key={teacher.id}>
                        <TableCell className="font-medium">{teacher.employeeId}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {teacher.photoUrl ? (
                              <img src={teacher.photoUrl} className="h-8 w-8 rounded-full object-cover" alt="" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-slate-200" />
                            )}
                            <div>
                              <div className="font-medium">{teacher.user.name}</div>
                              <div className="text-xs text-muted-foreground">{teacher.user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{teacher.phone}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {teacher.assignedClasses.map((ac: any) => (
                              <Badge key={ac.id} variant="outline" title={ac.subjects.join(", ")}>
                                Class {ac.className}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={teacher.user.isActive ? "default" : "secondary"} className={teacher.user.isActive ? "bg-green-600 hover:bg-green-700" : ""}>
                            {teacher.user.isActive ? "ACTIVE" : "INACTIVE"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEditModal(teacher)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeactivate(teacher.id, teacher.user.isActive)}>
                            {teacher.user.isActive ? <UserX className="h-4 w-4 text-red-500" /> : <UserCheck className="h-4 w-4 text-green-500" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredTeachers.length)} of {filteredTeachers.length}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                    Previous
                  </Button>
                  <div className="text-sm font-medium">Page {currentPage} of {totalPages}</div>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                    Next
                  </Button>
                </div>
              </div>
            )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={(open) => !submitting && setIsModalOpen(open)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Teacher" : "Add New Teacher"}</DialogTitle>
            <DialogDescription>
              {modalStep === 1 ? "Enter teacher's basic information." : "Assign classes and subjects."}
            </DialogDescription>
          </DialogHeader>
          
          {credentials ? (
            <div className="bg-green-50 p-6 rounded-md border border-green-200 space-y-4">
              <h3 className="text-lg font-bold text-green-800">Teacher Created Successfully!</h3>
              <p className="text-sm text-green-700">Share these login credentials with the teacher. They can update their profile after first login.</p>
              <div className="bg-white p-4 rounded border font-mono">
                <p><strong>Employee ID:</strong> {credentials.employeeId}</p>
                <p><strong>Email:</strong> {credentials.email}</p>
                <p><strong>Temp Password:</strong> {credentials.tempPassword}</p>
              </div>
              <Button onClick={() => {
                navigator.clipboard.writeText(`Employee ID: ${credentials.employeeId}\nEmail: ${credentials.email}\nPassword: ${credentials.tempPassword}`);
                toast({ title: "Copied to clipboard" });
              }} variant="outline" className="w-full">Copy Credentials</Button>
              <Button onClick={() => setIsModalOpen(false)} className="w-full">Done</Button>
            </div>
          ) : (
            <form onSubmit={modalStep === 1 ? (e) => { e.preventDefault(); setModalStep(2); } : handleSubmit}>
              {modalStep === 1 ? (
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" required disabled={isEditing} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone (Used as Temp Password)</Label>
                    <Input required pattern="^[6-9]\d{9}$" placeholder="10 digit number" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Qualification</Label>
                    <Select value={formData.qualification} onValueChange={(v: string) => setFormData({...formData, qualification: v})}>
                      <SelectTrigger><SelectValue placeholder="Select qualification" /></SelectTrigger>
                      <SelectContent>
                        {QUALIFICATION_LIST.map(q => (
                          <SelectItem key={q} value={q}>{q}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Joining Date</Label>
                    <Input type="date" required value={formData.joiningDate} onChange={e => setFormData({...formData, joiningDate: e.target.value})} />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Address</Label>
                    <Input required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                  </div>
                </div>
              ) : (
                <div className="py-4 space-y-6">
                  {CLASS_LIST.map(className => {
                    const isAssigned = formData.assignedClasses.some(ac => ac.className === className);
                    const classData = formData.assignedClasses.find(ac => ac.className === className);
                    return (
                      <div key={className} className="border p-4 rounded-md space-y-3">
                        <div className="flex items-center space-x-2 border-b pb-2">
                          <Checkbox 
                            id={`class-${className}`} 
                            checked={isAssigned} 
                            onCheckedChange={(c) => handleClassToggle(className, c as boolean)}
                          />
                          <Label htmlFor={`class-${className}`} className="font-bold text-lg">Class {className}</Label>
                        </div>
                        
                        {isAssigned && (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm text-muted-foreground">Select Subjects:</span>
                              <Button type="button" variant="ghost" size="sm" onClick={() => handleSelectAllSubjects(className)}>
                                Select All Subjects
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {SUBJECT_LIST.map(subject => (
                                <div key={subject} className="flex items-center space-x-2">
                                  <Checkbox 
                                    id={`subject-${className}-${subject}`}
                                    checked={classData?.subjects.includes(subject) || false}
                                    onCheckedChange={(c) => handleSubjectToggle(className, subject, c as boolean)}
                                  />
                                  <Label htmlFor={`subject-${className}-${subject}`} className="text-sm cursor-pointer">{subject}</Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              
              <DialogFooter>
                {modalStep === 1 ? (
                  <>
                    <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    <Button type="submit">Next: Assign Classes →</Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" type="button" onClick={() => setModalStep(1)}>← Back</Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Saving..." : (isEditing ? "Save Changes" : "Add Teacher")}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
