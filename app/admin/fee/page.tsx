"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { format } from "date-fns"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { DataBadge } from "@/components/shared/DataBadge"
import { Download, Plus, Receipt, IndianRupee, FileText } from "lucide-react"

export default function FeeManagement() {
  const { toast } = useToast()
  
  // States for Tabs
  const [activeTab, setActiveTab] = useState("structures")
  const [structures, setStructures] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [studentsList, setStudentsList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch logic
  useEffect(() => {
    fetchData(activeTab)
  }, [activeTab])

  const fetchData = async (tab: string) => {
    setLoading(true)
    try {
      if (tab === "structures") {
        const res = await fetch("/api/fee")
        setStructures(await res.json())
      } else if (tab === "payments" || tab === "reports") {
        const res = await fetch("/api/payments")
        setPayments(await res.json())
      } else if (tab === "manual") {
        const res = await fetch("/api/students")
        setStudentsList(await res.json())
      }
    } catch (e) {
      toast({ title: "Error", description: "Data fetch failed", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  // MANUAL ENTRY variables
  const [manualStudentId, setManualStudentId] = useState("")
  const [manualType, setManualType] = useState("")
  const [manualAmount, setManualAmount] = useState("")
  const [manualNote, setManualNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleManualPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers:{"Content-Type": "application/json"},
        body: JSON.stringify({ studentId: manualStudentId, type: manualType, amount: manualAmount, note: manualNote })
      })
      if (!res.ok) throw new Error()
      toast({ title: "Success", description: "Manual payment logged successfully." })
      setManualStudentId(""); setManualType(""); setManualAmount(""); setManualNote("");
      setActiveTab("payments")
    } catch(e) {
      toast({ title: "Error", description: "Failed to log payment.", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  // ADD STRUCTURE variables
  const [isStructModalOpen, setStructModal] = useState(false)
  const [structForm, setStructForm] = useState({ class: "", type: "", amount: "", dueDate: "" })

  const handleAddStructure = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/fee", {
        method: "POST",
        headers:{"Content-Type": "application/json"},
        body: JSON.stringify(structForm)
      })
      if (!res.ok) throw new Error()
      toast({ title: "Success", description: "Structure added." })
      setStructModal(false)
      fetchData("structures")
    } catch(e) {
      toast({ title: "Error", description: "Failed to add structure", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.text("Fee Payments Report", 14, 15)
    
    // Group monthly for reporting
    const monthlyDataMap = new Map()
    payments.forEach(p => {
      const m = format(new Date(p.createdAt), "MMM yyyy")
      if(!monthlyDataMap.has(m)) monthlyDataMap.set(m, { collected: 0, pending: 0, count: 0 })
      
      const stats = monthlyDataMap.get(m)
      if (p.status === "PAID") stats.collected += p.amount
      else if (p.status === "PENDING") stats.pending += p.amount
      stats.count++
    })

    const bodyData = Array.from(monthlyDataMap.entries()).map(([month, data]) => [
      month, `Rs ${data.collected}`, `Rs ${data.pending}`, data.count
    ])

    autoTable(doc, {
      startY: 20,
      head: [["Month", "Collected", "Pending", "Transactions Count"]],
      body: bodyData,
    })
    
    doc.save("Fee_Report.pdf")
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader 
        title="Fee Management" 
        description="Manage fee structures, track payments, and generate collection reports."
      />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full md:w-[600px] grid-cols-4 mb-4">
          <TabsTrigger value="structures">Structures</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {loading ? <div className="py-12"><LoadingSpinner /></div> : (
          <div className="mt-6">
            {/* STRUCTURES TAB */}
            <TabsContent value="structures" className="mt-0">
              <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Global Fee Structures</CardTitle>
                    <CardDescription>Define fee structures applicable across different classes.</CardDescription>
                  </div>
                  <Button onClick={() => setStructModal(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Add Structure
                  </Button>
                </CardHeader>
                <CardContent className="p-0 sm:p-6 sm:pt-0">
                  {structures.length === 0 ? (
                    <EmptyState 
                      icon={Receipt}
                      title="No fee structures"
                      description="You haven't defined any fee structures yet. Create one to get started."
                      action={{ label: "Add Structure", onClick: () => setStructModal(true) }}
                    />
                  ) : (
                    <div className="rounded-md border overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table className="min-w-[600px]">
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead>Class</TableHead>
                              <TableHead>Fee Type</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Due Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {structures.map(s => (
                              <TableRow key={s.id}>
                                <TableCell className="font-medium">Class {s.class}</TableCell>
                                <TableCell>{s.type}</TableCell>
                                <TableCell>₹{s.amount.toLocaleString()}</TableCell>
                                <TableCell>{format(new Date(s.dueDate), 'dd MMM yyyy')}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* PAYMENTS TAB */}
            <TabsContent value="payments" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>All Transactions</CardTitle>
                  <CardDescription>A comprehensive list of all student fee payments.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 sm:p-6 sm:pt-0">
                  {payments.length === 0 ? (
                    <EmptyState 
                      icon={IndianRupee}
                      title="No transactions found"
                      description="There are no payment records available yet."
                    />
                  ) : (
                    <div className="rounded-md border overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table className="min-w-[800px]">
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Student</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Ref ID</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {payments.map(p => (
                              <TableRow key={p.id}>
                                <TableCell className="whitespace-nowrap">{format(new Date(p.createdAt), 'dd MMM yyyy')}</TableCell>
                                <TableCell>
                                  <div className="font-medium">{p.student?.user?.name}</div>
                                  <div className="text-xs text-muted-foreground">Class {p.student?.class}</div>
                                </TableCell>
                                <TableCell>{p.type}</TableCell>
                                <TableCell className="font-medium">₹{p.amount.toLocaleString()}</TableCell>
                                <TableCell>
                                  <DataBadge status={p.status} />
                                </TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">{p.razorpayOrderId}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* MANUAL ENTRY TAB */}
            <TabsContent value="manual" className="mt-0">
              <Card className="max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle>Log Cash Payment</CardTitle>
                  <CardDescription>Manually record a fee payment received in cash or via other offline methods.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleManualPayment} className="space-y-5">
                    <div className="space-y-2">
                      <Label>Select Student</Label>
                      <Select value={manualStudentId} onValueChange={setManualStudentId} required>
                        <SelectTrigger><SelectValue placeholder="Search student" /></SelectTrigger>
                        <SelectContent className="max-h-64">
                          {studentsList.map(st => (
                            <SelectItem key={st.id} value={st.id}>{st.user?.name} (Roll: {st.rollNo})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Fee Type</Label>
                      <Input required value={manualType} onChange={e => setManualType(e.target.value)} placeholder="e.g. Tuition Fee Q1" />
                    </div>
                    <div className="space-y-2">
                      <Label>Amount (₹)</Label>
                      <Input required type="number" min="1" value={manualAmount} onChange={e => setManualAmount(e.target.value)} placeholder="0.00" />
                    </div>
                    <div className="space-y-2">
                      <Label>Cashier Note</Label>
                      <Input required value={manualNote} onChange={e => setManualNote(e.target.value)} placeholder="e.g. Cash received by office" />
                    </div>
                    <div className="pt-2">
                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? "Logging Payment..." : "Log Payment (PAID)"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* REPORTS TAB */}
            <TabsContent value="reports" className="mt-0">
              <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Monthly Analytics</CardTitle>
                    <CardDescription>Generate and download fee collection reports.</CardDescription>
                  </div>
                  <Button onClick={exportPDF} variant="outline" className="bg-primary/5 border-primary/20 hover:bg-primary/10">
                    <Download className="mr-2 h-4 w-4" /> Export PDF
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border bg-muted/20 p-8 text-center flex flex-col items-center justify-center">
                    <FileText className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
                    <h3 className="font-semibold text-lg mb-1">Fee Collection Report</h3>
                    <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
                      Click "Export PDF" to download the generated analytics report containing collections vs pending amounts grouped month by month.
                    </p>
                    <Button onClick={exportPDF}>
                      Generate Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        )}
      </Tabs>

      {/* Structure Modal */}
      <Dialog open={isStructModalOpen} onOpenChange={setStructModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>New Fee Structure</DialogTitle>
            <DialogDescription>Add a new fee requirement for a specific class.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddStructure} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Class</Label>
              <Input required value={structForm.class} onChange={e => setStructForm({...structForm, class: e.target.value})} placeholder="e.g. 5" />
            </div>
            <div className="space-y-2">
              <Label>Fee Type</Label>
              <Input required value={structForm.type} onChange={e => setStructForm({...structForm, type: e.target.value})} placeholder="e.g. Annual Charges"/>
            </div>
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input required type="number" min="1" value={structForm.amount} onChange={e => setStructForm({...structForm, amount: e.target.value})} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input required type="date" value={structForm.dueDate} onChange={e => setStructForm({...structForm, dueDate: e.target.value})} />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setStructModal(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating..." : "Create Structure"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
