"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { Search, Download, Plus, Edit, UserX } from "lucide-react"

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
  const [credentials, setCredentials] = useState<{email: string, password: string} | null>(null)

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
      setCurrentPage(1) // Reset page on new filters
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
      
      toast({ title: "Success", description: isEditing ? "Student updated" : "Student created." })
      
      if (!isEditing && result.user?.email) {
        setCredentials({ email: result.user.email, password: formData.contact })
        fetchStudents()
      } else {
        setIsModalOpen(false)
        fetchStudents()
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const totalPages = Math.ceil(students.length / itemsPerPage)
  const paginatedStudents = students.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Manage Students</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={openAddModal}>
            <Plus className="mr-2 h-4 w-4" /> Add Student
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
                placeholder="Search name or roll no..."
                className="w-full pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full md:w-48">
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Class" />
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
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <LoadingSpinner /> : (
            <div className="space-y-4">
              <div className="border rounded-md overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader>
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
                  {students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No students found.</TableCell>
                    </TableRow>
                  ) : (
                    paginatedStudents.map(student => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.rollNo}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {student.photoUrl ? (
                              <img src={student.photoUrl} className="h-8 w-8 rounded-full object-cover" alt="" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-slate-200" />
                            )}
                            {student.user?.name}
                          </div>
                        </TableCell>
                        <TableCell>{student.class} - {student.section}</TableCell>
                        <TableCell>{student.parentName}</TableCell>
                        <TableCell>{student.contact}</TableCell>
                        <TableCell>
                          <Badge variant={student.user?.isActive ? "default" : "secondary"}>
                            {student.user?.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEditModal(student)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {student.user?.isActive && (
                            <Button variant="ghost" size="icon" onClick={() => handleDeactivate(student.id)}>
                              <UserX className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Student" : "Add New Student"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Update student information." : "Enter student details to add them to the system."}
            </DialogDescription>
          </DialogHeader>
          
          {credentials ? (
            <div className="bg-green-50 p-6 rounded-md border border-green-200 space-y-4">
              <h3 className="text-lg font-bold text-green-800">Student Created Successfully!</h3>
              <p className="text-sm text-green-700">Please provide these login credentials to the student/parent immediately. They will not be shown again.</p>
              <div className="bg-white p-4 rounded border font-mono">
                <p><strong>Email (Login ID):</strong> {credentials.email}</p>
                <p><strong>Password:</strong> {credentials.password}</p>
              </div>
              <Button onClick={() => setIsModalOpen(false)} className="w-full">Done</Button>
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
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : "Save Student"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
