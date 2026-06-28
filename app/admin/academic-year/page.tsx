"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2, CheckCircle, GraduationCap, AlertCircle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function AcademicYearPage() {
  const { toast } = useToast()
  const [years, setYears] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Promotion modal states
  const [promoteOpen, setPromoteOpen] = useState(false)
  const [promotingYear, setPromotingYear] = useState<any>(null)
  const [targetYearId, setTargetYearId] = useState("")
  const [isPromoting, setIsPromoting] = useState(false)

  // New Year Form
  const [newYear, setNewYear] = useState({
    year: "",
    startDate: "",
    endDate: ""
  })

  const handlePromoteStudents = async () => {
    if (!targetYearId) {
      toast({ title: "Error", description: "Please select a target academic year", variant: "destructive" })
      return
    }

    setIsPromoting(true)

    try {
      // 1. Fetch active students to promote
      const studentRes = await fetch("/api/students")
      const studentData = await studentRes.json()
      
      if (!studentRes.ok) throw new Error(studentData.error || "Failed to fetch student list")

      const studentsList = Array.isArray(studentData) ? studentData : []
      if (studentsList.length === 0) {
        toast({ title: "Information", description: "No active students found to promote." })
        setIsPromoting(false)
        setPromoteOpen(false)
        return
      }

      // Generate default decisions: Promote everyone, keeping their current section
      const decisions = studentsList.map((s: any) => ({
        studentId: s.id,
        decision: "PROMOTE",
        newSection: s.section || "A"
      }))

      // 2. Call the promote API with confirmationToken
      const promoteRes = await fetch(`/api/academic-year/${promotingYear.id}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newAcademicYearId: targetYearId,
          confirmationToken: promotingYear.id,
          decisions
        })
      })

      const promoteResult = await promoteRes.json()

      if (!promoteRes.ok || !promoteResult.success) {
        throw new Error(promoteResult.error || "Failed to process promotion")
      }

      toast({ 
        title: "Promotion Completed!", 
        description: `Successfully promoted ${promoteResult.promoted} students, detained ${promoteResult.detained}, graduated ${promoteResult.graduated}.` 
      })

      setPromoteOpen(false)
      loadYears()
    } catch (error: any) {
      toast({ title: "Promotion Failed", description: error.message, variant: "destructive" })
    } finally {
      setIsPromoting(false)
    }
  }

  useEffect(() => {
    loadYears()
  }, [])

  const loadYears = async () => {
    try {
      const res = await fetch("/api/academic-year")
      const data = await res.json()
      if (res.ok && data.success) {
        setYears(data.data?.years ?? [])
      } else {
        setYears([])
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to fetch academic years", variant: "destructive" })
      setYears([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateYear = async () => {
    // Validate before sending
    if (!newYear.year.trim()) {
      setFormError("Please enter the academic year.")
      return
    }
    if (!newYear.startDate) {
      setFormError("Please select a start date.")
      return
    }
    if (!newYear.endDate) {
      setFormError("Please select an end date.")
      return
    }

    // Validate year format client side
    const yearRegex = /^\d{4}-\d{2}$/
    if (!yearRegex.test(newYear.year.trim())) {
      setFormError("Year must be in format YYYY-YY (e.g. 2024-25)")
      return
    }

    setIsCreating(true)
    setFormError(null)

    try {
      const res = await fetch("/api/academic-year", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: newYear.year.trim(),
          startDate: newYear.startDate,
          endDate: newYear.endDate,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setFormError(data.error || "Failed to create year.")
        return
      }

      toast({ title: `Academic year ${newYear.year} created!` })

      // Reset form
      setNewYear({ year: "", startDate: "", endDate: "" })

      // Reload years list
      await loadYears()

    } catch {
      setFormError("Something went wrong. Please try again.")
    } finally {
      setIsCreating(false)
    }
  }

  const handleSetCurrent = async (id: string) => {
    try {
      const res = await fetch(`/api/academic-year/${id}/set-current`, { method: "PATCH" })
      if (!res.ok) throw new Error("Failed to set current year")
      toast({ title: "Success", description: "Current academic year updated" })
      loadYears()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  const handleClose = async (id: string) => {
    if (!confirm("Are you sure you want to close this academic year? This will allow student promotion.")) return
    try {
      const res = await fetch(`/api/academic-year/${id}/close`, { method: "POST" })
      if (!res.ok) throw new Error("Failed to close year")
      toast({ title: "Success", description: "Academic year closed" })
      loadYears()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Academic Years"
        description="Manage academic sessions, close years, and promote students"
      />

      <div className="grid md:grid-cols-3 gap-6">
        {/* Create Form */}
        <Card className="md:col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex justify-between items-center">
              Add New Year
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date()
                  const month = now.getMonth() + 1
                  const y = now.getFullYear()
                  const yearStr = month >= 4
                    ? `${y}-${String(y + 1).slice(2)}`
                    : `${y - 1}-${String(y).slice(2)}`
                  const startYear = parseInt(yearStr.split("-")[0])
                  setNewYear({
                    year: yearStr,
                    startDate: `${startYear}-04-01`,
                    endDate: `${startYear + 1}-03-31`,
                  })
                  setFormError(null)
                }}
              >
                Fill Current Year
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="year">
                  Academic Year
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <Input
                  id="year"
                  placeholder="e.g. 2024-25"
                  value={newYear.year}
                  onChange={(e) => {
                    setNewYear((prev) => ({ ...prev, year: e.target.value }))
                    setFormError(null)
                  }}
                  maxLength={7}
                />
                <p className="text-xs text-muted-foreground">
                  Format: YYYY-YY (e.g. 2024-25 for April 2024 to March 2025)
                </p>
              </div>
              <div className="space-y-2">
                <Label>Start Date <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  required
                  value={newYear.startDate}
                  onChange={e => {
                    setNewYear({...newYear, startDate: e.target.value})
                    setFormError(null)
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  required
                  value={newYear.endDate}
                  onChange={e => {
                    setNewYear({...newYear, endDate: e.target.value})
                    setFormError(null)
                  }}
                />
              </div>

              {formError && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {formError}
                </div>
              )}

              <Button
                type="button"
                className="w-full"
                disabled={isCreating}
                onClick={handleCreateYear}
              >
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Year
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* List */}
        <Card className="md:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Existing Academic Years</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : years.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground border-2 border-dashed rounded-lg">
                No academic years found. Create one to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {years.map(y => (
                  <div key={y.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-lg ${y.isCurrent ? "border-blue-500 bg-blue-50" : y.isClosed ? "bg-slate-50 opacity-80" : "bg-white"}`}>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-lg">{y.year}</h3>
                        {y.isCurrent && <span className="bg-blue-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Current</span>}
                        {y.isClosed && <span className="bg-slate-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Closed</span>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(y.startDate).toLocaleDateString()} — {new Date(y.endDate).toLocaleDateString()}
                      </p>
                      <p className="text-xs font-medium text-slate-500 mt-1">
                        Students Enrolled: {y._count?.students ?? 0}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {!y.isCurrent && !y.isClosed && (
                        <Button variant="outline" size="sm" onClick={() => handleSetCurrent(y.id)}>
                          Set as Current
                        </Button>
                      )}
                      {y.isCurrent && !y.isClosed && (
                        <Button variant="destructive" size="sm" onClick={() => handleClose(y.id)}>
                          Close Year
                        </Button>
                      )}
                      {y.isClosed && (
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-200"
                          onClick={() => {
                            setPromotingYear(y)
                            setTargetYearId("")
                            setPromoteOpen(true)
                          }}
                        >
                          <GraduationCap className="h-4 w-4 mr-2" />
                          Promote Students
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Student Promotion Dialog */}
      <Dialog open={promoteOpen} onOpenChange={setPromoteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-900">
              <GraduationCap className="h-5 w-5" /> Promote Students
            </DialogTitle>
            <DialogDescription>
              Promote active students from the closed year <strong>{promotingYear?.year}</strong> to a target academic year.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="targetYear">Target Academic Year</Label>
              <Select value={targetYearId} onValueChange={setTargetYearId}>
                <SelectTrigger id="targetYear" className="w-full">
                  <SelectValue placeholder="Select target year" />
                </SelectTrigger>
                <SelectContent>
                  {years
                    .filter(y => y.id !== promotingYear?.id && !y.isClosed)
                    .map(y => (
                      <SelectItem key={y.id} value={y.id}>
                        {y.year} {y.isCurrent ? "(Current)" : ""}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Important Note</p>
                <p className="text-xs mt-0.5 leading-relaxed">
                  This action will bulk-promote all active students to the next class grade (based on the class map) in the selected target year. This process is irreversible.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoteOpen(false)} disabled={isPromoting}>
              Cancel
            </Button>
            <Button 
              onClick={handlePromoteStudents} 
              disabled={isPromoting || !targetYearId}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isPromoting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Process Promotion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
