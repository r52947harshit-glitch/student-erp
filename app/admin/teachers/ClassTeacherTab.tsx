import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { CLASS_LIST } from "@/lib/constants"
import { Badge } from "@/components/ui/badge"
import { Edit2, UserX } from "lucide-react"

export function ClassTeacherTab({ teachers }: { teachers: any[] }) {
  const [classesData, setClassesData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedClassForModal, setSelectedClassForModal] = useState("")
  const [selectedTeacherId, setSelectedTeacherId] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchClassTeachers = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/class-teacher")
      const data = await res.json()
      setClassesData(data.classes || [])
    } catch (e) {
      toast({ title: "Error", description: "Failed to fetch class teachers", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClassTeachers()
  }, [])

  const openAssignModal = (className: string, currentTeacherId?: string) => {
    setSelectedClassForModal(className)
    setSelectedTeacherId(currentTeacherId || "")
    setIsModalOpen(true)
  }

  const handleAssign = async () => {
    if (!selectedTeacherId) {
      toast({ title: "Validation Error", description: "Please select a teacher", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/class-teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ className: selectedClassForModal, teacherId: selectedTeacherId })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      toast({ title: "Success", description: "Class teacher assigned successfully" })
      setIsModalOpen(false)
      fetchClassTeachers()
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemove = async (className: string) => {
    if (!confirm(`Are you sure you want to remove the class teacher for Class ${className}?`)) return
    
    try {
      const res = await fetch(`/api/class-teacher?className=${encodeURIComponent(className)}`, {
        method: "DELETE"
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      toast({ title: "Success", description: "Class teacher removed successfully" })
      fetchClassTeachers()
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    }
  }

  // Eligible teachers for the selected class (teachers who are assigned to this class)
  const eligibleTeachers = teachers.filter(t => 
    t.user.isActive && t.assignedClasses.some((ac: any) => ac.className === selectedClassForModal)
  )

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Class Teacher Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <LoadingSpinner /> : (
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead>Class Teacher</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classesData.map(c => (
                    <TableRow key={c.className}>
                      <TableCell className="font-medium text-lg">Class {c.className}</TableCell>
                      <TableCell>
                        {c.classTeacher ? (
                          <div className="flex items-center gap-3">
                            {c.classTeacher.photoUrl ? (
                              <img src={c.classTeacher.photoUrl} className="h-8 w-8 rounded-full object-cover" alt="" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-slate-200" />
                            )}
                            <div>
                              <div className="font-medium">{c.classTeacher.name}</div>
                              <div className="text-xs text-muted-foreground">{c.classTeacher.employeeId}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">No teacher assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {c.classTeacher ? (
                          <Badge className="bg-green-600">Assigned</Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">Unassigned</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openAssignModal(c.className, c.classTeacher?.id)}>
                          <Edit2 className="h-4 w-4 mr-2" /> Assign / Change
                        </Button>
                        {c.classTeacher && (
                          <Button variant="ghost" size="sm" onClick={() => handleRemove(c.className)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                            <UserX className="h-4 w-4 mr-2" /> Remove
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={(open) => !submitting && setIsModalOpen(open)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto w-full max-w-lg mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>Assign Class Teacher — Class {selectedClassForModal}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-slate-600">
              Select an eligible teacher. Only teachers who are actively teaching a subject in Class {selectedClassForModal} are listed.
            </p>
            <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a teacher" />
              </SelectTrigger>
              <SelectContent>
                {eligibleTeachers.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">No active teachers assigned to this class.</div>
                ) : (
                  eligibleTeachers.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.user.name} ({t.employeeId})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={submitting || !selectedTeacherId}>
              {submitting ? "Saving..." : "Save Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
