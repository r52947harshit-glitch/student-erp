"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { Search, Download, Plus, UserX, MoreHorizontal, Pencil, Users, Copy, Printer, CheckCircle } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { DataBadge } from "@/components/shared/DataBadge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getInitials, getAvatarColor } from "@/lib/formatters"
import { cn } from "@/lib/utils"

export default function ManageStudents() {
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterClass, setFilterClass] = useState("ALL")
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  
  // Form State
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    class: "",
    section: "",
    dob: "",
    parentName: "",
    contact: "",
    address: "",
  })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  
  // Credentials Display
  const [credentials, setCredentials] = useState<{email: string, password: string, name: string, rollNo: string, class: string, section: string} | null>(null)

  const { toast } = useToast()

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const url = new URL("/api/students", window.location.origin)
      if (filterClass !== "ALL") url.searchParams.set("class", filterClass)
      if (search) url.searchParams.set("search", search)
        
      const res = await fetch(url.toString())
      const data = await res.json()
      setStudents(data)
      setCurrentPage(1)
    } catch (e) {
      toast({ title: "Error", description: "Failed to fetch students", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchStudents()
    }, 500)
    return () => clearTimeout(delayDebounce)
  }, [filterClass, search])

  const handleExportCSV = () => {
    const headers = ["Roll No,Name,Class,Section,Parent Name,Contact,Address,Status"]
    const csvData = students.map(s => 
      `${s.rollNo},"${s.user?.name}",${s.class},${s.section},"${s.parentName}",${s.contact},"${s.address}",${s.user?.isActive ? 'Active' : 'Inactive'}`
    )
    const blob = new Blob([[headers.join(",\n"), ...csvData].join("\n")], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.setAttribute('href', url)
    a.setAttribute('download', 'students.csv')
    a.click()
  }

  const openAddModal = () => {
    setIsEditing(false)
    setFormData({ id: "", name: "", class: "", section: "", dob: "", parentName: "", contact: "", address: "" })
    setPhotoFile(null)
    setCredentials(null)
    setSuccess(false)
    setIsModalOpen(true)
  }

  const openEditModal = (student: any) => {
    setIsEditing(true)
    setFormData({
      id: student.id,
      name: student.user.name,
      class: student.class,
      section: student.section,
      dob: student.dob.split('T')[0],
      parentName: student.parentName,
      contact: student.contact,
      address: student.address,
    })
    setPhotoFile(null)
    setCredentials(null)
    setSuccess(false)
    setIsModalOpen(true)
  }

  const handleDeactivate = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this student?")) return
    try {
      const res = await fetch(`/api/students/${id}/deactivate`, { method: 'PATCH' })
      if (!res.ok) throw new Error()
      toast({ title: "Success", description: "Student deactivated." })
      fetchStudents()
    } catch (e) {
      toast({ title: "Error", description: "Failed to deactivate", variant: "destructive" })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      let photoUrl = ""
      if (photoFile) {
        if (photoFile.size > 2 * 1024 * 1024) {
          throw new Error("File size limit exceeded. Max size is 2MB.")
        }
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(photoFile.type)) {
          throw new Error("Invalid file type. Only JPEG, PNG, or WEBP formats are allowed.")
        }
        
        const fileExt = photoFile.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const { data, error } = await supabase.storage.from('student-photos').upload(`photos/${fileName}`, photoFile)
        if (error) throw new Error("Failed to upload photo to Supabase")
        const { data: { publicUrl } } = supabase.storage.from('student-photos').getPublicUrl(`photos/${fileName}`)
        photoUrl = publicUrl
      }

      const payload = { ...formData, photoUrl: photoUrl || undefined }
      
      const endpoint = isEditing ? `/api/students/${formData.id}` : `/api/students`
      const method = isEditing ? `PUT` : `POST`

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      const result = await res.json()
      
      if (!res.ok) throw new Error(result.error)
      
      setSuccess(true)
      toast({ title: "Success", description: isEditing ? "Student updated" : "Student created." })
      
      setTimeout(() => {
        if (!isEditing && result.user?.email) {
          setCredentials({ 
            email: result.user.email, 
            password: formData.contact,
            name: formData.name,
            rollNo: result.student?.rollNo || "Pending",
            class: formData.class,
            section: formData.section
          })
          fetchStudents()
        } else {
          setIsModalOpen(false)
          fetchStudents()
        }
        setSubmitting(false)
        setSuccess(false)
      }, 500)

    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
      setSubmitting(false)
    }
  }

  const totalPages = Math.ceil(students.length / itemsPerPage)
  const paginatedStudents = students.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader 
        title="Manage Students" 
        description="View, add, edit, and manage all students in the school."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={openAddModal}>
              <Plus className="mr-2 h-4 w-4" /> Add Student
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader className="py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or roll number..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Classes</SelectItem>
                <SelectItem value="Nursery">Nursery</SelectItem>
                <SelectItem value="KG">KG</SelectItem>
                {[1,2,3,4,5,6,7,8].map(c => (
                  <SelectItem key={c} value={String(c)}>Class {c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {loading ? <div className="py-8"><LoadingSpinner /></div> : (
            <div className="space-y-4">
              {students.length === 0 ? (
                <EmptyState 
                  icon={Users}
                  title="No students found"
                  description="We couldn't find any students matching your filters. Try adjusting your search or add a new student."
                  action={search || filterClass !== "ALL" ? { label: "Clear Filters", onClick: () => { setSearch(""); setFilterClass("ALL"); } } : undefined}
                />
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table className="min-w-[800px]">
                      <TableHeader className="bg-muted/50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead>Roll No</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Class-Sec</TableHead>
                          <TableHead>Parent</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedStudents.map(student => (
                          <TableRow key={student.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">{student.rollNo}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                  <AvatarImage src={student.photoUrl || ""} />
                                  <AvatarFallback className={cn("text-white font-medium", getAvatarColor(student.user?.name || "S"))}>
                                    {getInitials(student.user?.name || "S")}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{student.user?.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>Class {student.class} - {student.section}</TableCell>
                            <TableCell>{student.parentName}</TableCell>
                            <TableCell>{student.contact}</TableCell>
                            <TableCell>
                              <DataBadge status={student.user?.isActive ? "ACTIVE" : "INACTIVE"} />
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="hover:bg-muted">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditModal(student)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  {student.user?.isActive && (
                                    <DropdownMenuItem onClick={() => handleDeactivate(student.id)} className="text-destructive focus:text-destructive">
                                      <UserX className="mr-2 h-4 w-4" />
                                      Deactivate
                                    </DropdownMenuItem>
                                  )}
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
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 pt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, students.length)} of {students.length}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto w-full max-w-lg mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Student" : "Add New Student"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Update student information." : "Enter student details to add them to the system."}
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
                    <h3 className="text-lg font-bold text-green-900">Student Created!</h3>
                    <p className="text-sm text-green-700">Provide these credentials to the student.</p>
                  </div>
                </div>
                
                <div id="credential-card" className="bg-white p-5 rounded-lg border shadow-sm print:shadow-none font-mono text-sm space-y-3">
                  <div className="border-b pb-3 mb-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">School ERP - Student Login</p>
                    <p className="font-bold text-lg">{credentials.name}</p>
                    <p className="text-muted-foreground">Class {credentials.class} - {credentials.section} | Roll: {credentials.rollNo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Login Email</p>
                    <p className="font-medium text-base">{credentials.email}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Temporary Password</p>
                      <p className="font-medium text-base">{credentials.password}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="secondary"
                      className="print:hidden"
                      onClick={() => {
                        navigator.clipboard.writeText(`Login URL: ${window.location.origin}/login\nEmail: ${credentials.email}\nPassword: ${credentials.password}`);
                        toast({ title: "Credentials copied to clipboard!" });
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" /> Copy
                    </Button>
                  </div>
                  <div className="pt-2">
                    <div className="h-1.5 w-full bg-orange-200 rounded-full overflow-hidden flex">
                      <div className="h-full bg-orange-500 w-1/3"></div>
                    </div>
                    <p className="text-[10px] text-orange-600 mt-1">Weak password. Student should change it on first login.</p>
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
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input type="date" required value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select value={formData.class} onValueChange={(v: string) => setFormData({...formData, class: v})}>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Nursery">Nursery</SelectItem>
                      <SelectItem value="KG">KG</SelectItem>
                      {[1,2,3,4,5,6,7,8].map(c => (
                        <SelectItem key={c} value={String(c)}>Class {c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Section</Label>
                  <Select value={formData.section} onValueChange={(v: string) => setFormData({...formData, section: v})}>
                    <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                      <SelectItem value="C">C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Parent Name</Label>
                  <Input required value={formData.parentName} onChange={e => setFormData({...formData, parentName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Contact Number (Used as Temp Password)</Label>
                  <Input required value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Address</Label>
                  <Input required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Photo Upload (Optional)</Label>
                  <Input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files?.[0] || null)} />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : success ? <CheckCircle className="mr-2 h-4 w-4 text-white" /> : "Save Student"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
