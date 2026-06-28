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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { Search, Plus, UserX, UserCheck, MoreHorizontal, Pencil, Users, CheckCircle, Copy, Printer } from "lucide-react"
import { CLASS_LIST, SUBJECT_LIST, QUALIFICATION_LIST } from "@/lib/constants"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ClassTeacherTab } from "./ClassTeacherTab"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { DataBadge } from "@/components/shared/DataBadge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getInitials, getAvatarColor } from "@/lib/formatters"
import { cn } from "@/lib/utils"

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
  const [success, setSuccess] = useState(false)
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
  
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState("")
  
  // Credentials Display
  const [credentials, setCredentials] = useState<{email: string, tempPassword: string, employeeId: string, name: string} | null>(null)

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
    setPhotoFile(null)
    setPhotoPreview(null)
    setPhotoError("")
    setCredentials(null)
    setSuccess(false)
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
    setPhotoFile(null)
    setPhotoPreview(teacher.photoUrl || null)
    setPhotoError("")
    setCredentials(null)
    setSuccess(false)
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

    if (photoError) return

    setSubmitting(true)
    try {
      const endpoint = isEditing ? `/api/teachers/${formData.id}` : `/api/teachers`
      const method = isEditing ? `PUT` : `POST`

      const payload = new FormData()
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'assignedClasses') {
          payload.append(key, JSON.stringify(value))
        } else if (value && key !== 'email') { // Omit email if editing logic requires it later, or handle in API
          payload.append(key, value as string)
        } else if (key === 'email') {
          if (!isEditing) payload.append(key, value as string)
        }
      })

      if (photoFile) {
        payload.append("photo", photoFile)
      }

      const res = await fetch(endpoint, {
        method,
        body: payload,
      })
      const result = await res.json()
      
      if (!res.ok) throw new Error(result.error)
      
      setSuccess(true)
      toast({ title: "Success", description: isEditing ? "Teacher updated" : "Teacher added successfully" })
      
      setTimeout(() => {
        if (!isEditing && result.credentials) {
          setCredentials({ ...result.credentials, employeeId: result.teacher.employeeId, name: formData.name })
          fetchTeachers()
        } else {
          setIsModalOpen(false)
          fetchTeachers()
        }
        setSubmitting(false)
        setSuccess(false)
      }, 500)

    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
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
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader 
        title="Manage Teachers" 
        description="View, add, edit, and manage all teachers in the school."
        action={
          <Button onClick={openAddModal}>
            <Plus className="mr-2 h-4 w-4" /> Add Teacher
          </Button>
        }
      />

      <Tabs defaultValue="all-teachers" className="w-full">
        <TabsList className="mb-4 bg-slate-100">
          <TabsTrigger value="all-teachers">All Teachers</TabsTrigger>
          <TabsTrigger value="class-teachers">Class Teachers</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all-teachers" className="mt-0">
          <Card>
            <CardHeader className="py-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search name or employee ID..."
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              {loading ? <div className="py-8"><LoadingSpinner /></div> : (
                <div className="space-y-4">
                  {filteredTeachers.length === 0 ? (
                    <EmptyState 
                      icon={Users}
                      title="No teachers found"
                      description="We couldn't find any teachers matching your filters. Try adjusting your search or add a new teacher."
                      action={search || filterStatus !== "ALL" ? { label: "Clear Filters", onClick: () => { setSearch(""); setFilterStatus("ALL"); } } : undefined}
                    />
                  ) : (
                    <div className="rounded-md border overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table className="min-w-[900px]">
                          <TableHeader className="bg-muted/50 sticky top-0 z-10">
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
                            {paginatedTeachers.map(teacher => (
                              <TableRow key={teacher.id} className="hover:bg-muted/50">
                                <TableCell className="font-medium">{teacher.employeeId}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9">
                                      <AvatarImage src={teacher.photoUrl || ""} />
                                      <AvatarFallback className={cn("text-white font-medium", getAvatarColor(teacher.user?.name || "T"))}>
                                        {getInitials(teacher.user?.name || "T")}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="font-medium flex items-center gap-2">
                                        {teacher.user.name}
                                        {teacher.isClassTeacher && (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
                                            Class Teacher
                                          </span>
                                        )}
                                      </div>
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
                                  <DataBadge status={teacher.user.isActive ? "ACTIVE" : "INACTIVE"} />
                                </TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="hover:bg-muted">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => openEditModal(teacher)}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => handleDeactivate(teacher.id, teacher.user.isActive)}
                                        className={teacher.user.isActive ? "text-destructive focus:text-destructive" : "text-green-600 focus:text-green-600"}
                                      >
                                        {teacher.user.isActive ? (
                                          <><UserX className="mr-2 h-4 w-4" /> Deactivate</>
                                        ) : (
                                          <><UserCheck className="mr-2 h-4 w-4" /> Reactivate</>
                                        )}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                  
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-2 pt-4">
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
        </TabsContent>
        <TabsContent value="class-teachers" className="mt-0">
          <ClassTeacherTab teachers={teachers} />
        </TabsContent>
      </Tabs>

      <Dialog open={isModalOpen} onOpenChange={(open) => !submitting && setIsModalOpen(open)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto w-full max-w-2xl mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Teacher" : "Add New Teacher"}</DialogTitle>
            <DialogDescription>
              {modalStep === 1 ? "Enter teacher's basic information." : "Assign classes and subjects."}
            </DialogDescription>
          </DialogHeader>
          
          {credentials ? (
            <div className="space-y-6 py-4">
              <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-green-900">Teacher Created!</h3>
                    <p className="text-sm text-green-700">Share these login credentials with the teacher.</p>
                  </div>
                </div>
                
                <div id="credential-card" className="bg-white p-5 rounded-lg border shadow-sm print:shadow-none font-mono text-sm space-y-3">
                  <div className="border-b pb-3 mb-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">School ERP - Teacher Login</p>
                    <p className="font-bold text-lg">{credentials.name}</p>
                    <p className="text-muted-foreground">Employee ID: {credentials.employeeId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Login Email</p>
                    <p className="font-medium text-base">{credentials.email}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Temporary Password</p>
                      <p className="font-medium text-base">{credentials.tempPassword}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="secondary"
                      className="print:hidden"
                      onClick={() => {
                        navigator.clipboard.writeText(`Employee ID: ${credentials.employeeId}\nEmail: ${credentials.email}\nPassword: ${credentials.tempPassword}`);
                        toast({ title: "Copied to clipboard" });
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" /> Copy
                    </Button>
                  </div>
                  <div className="pt-2">
                    <div className="h-1.5 w-full bg-orange-200 rounded-full overflow-hidden flex">
                      <div className="h-full bg-orange-500 w-1/3"></div>
                    </div>
                    <p className="text-[10px] text-orange-600 mt-1">Weak password. Teacher should change it on first login.</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" /> Print Card
                </Button>
                <Button className="flex-1" onClick={() => setIsModalOpen(false)}>Done</Button>
              </div>
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
                  <div className="col-span-2 space-y-2">
                    <Label>Photo Upload</Label>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16 border-2 border-slate-100">
                        <AvatarImage src={photoPreview || ""} className="object-cover" />
                        <AvatarFallback className="bg-slate-50 text-slate-400">
                          <Users className="h-6 w-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <Input 
                          type="file" 
                          accept="image/jpeg,image/png,image/webp" 
                          className={photoError ? "border-destructive" : ""}
                          onChange={e => {
                            const file = e.target.files?.[0]
                            setPhotoError("")
                            if (!file) {
                              setPhotoFile(null)
                              setPhotoPreview(null)
                              return
                            }
                            if (file.size > 2 * 1024 * 1024) {
                              setPhotoError("Image must be under 2MB")
                              e.target.value = "" // reset
                              return
                            }
                            setPhotoFile(file)
                            setPhotoPreview(URL.createObjectURL(file))
                          }} 
                        />
                        {photoError ? (
                          <p className="text-xs text-destructive">{photoError}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Max size: 2MB. Formats: JPG, PNG, WEBP.
                          </p>
                        )}
                      </div>
                    </div>
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
              
              <DialogFooter className="mt-4">
                {modalStep === 1 ? (
                  <>
                    <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    <Button type="submit">Next: Assign Classes →</Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" type="button" onClick={() => setModalStep(1)}>← Back</Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Saving..." : success ? <CheckCircle className="mr-2 h-4 w-4 text-white" /> : (isEditing ? "Save Changes" : "Add Teacher")}
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
