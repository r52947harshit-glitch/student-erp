"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { format } from "date-fns"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

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

  const handleManualPayment = async (e: React.FormEvent) => {
    e.preventDefault()
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
    }
  }

  // ADD STRUCTURE variables
  const [isStructModalOpen, setStructModal] = useState(false)
  const [structForm, setStructForm] = useState({ class: "", type: "", amount: "", dueDate: "" })

  const handleAddStructure = async (e: React.FormEvent) => {
    e.preventDefault()
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
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Fee Management</h2>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full md:w-[600px] grid-cols-4">
          <TabsTrigger value="structures">Structures</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {loading ? <LoadingSpinner /> : (
          <>
            {/* STRUCTURES TAB */}
            <TabsContent value="structures" className="mt-6">
              <Card>
                <CardHeader className="flex flex-row justify-between">
                  <CardTitle>Global Fee Structures</CardTitle>
                  <Button onClick={() => setStructModal(true)}>Add Structure</Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
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
                          <TableCell>Class {s.class}</TableCell>
                          <TableCell>{s.type}</TableCell>
                          <TableCell>₹{s.amount}</TableCell>
                          <TableCell>{format(new Date(s.dueDate), 'dd MMM yyyy')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PAYMENTS TAB */}
            <TabsContent value="payments" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>All Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
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
                          <TableCell>{format(new Date(p.createdAt), 'dd MMM yyyy')}</TableCell>
                          <TableCell>{p.student?.user?.name} (Class {p.student?.class})</TableCell>
                          <TableCell>{p.type}</TableCell>
                          <TableCell>₹{p.amount}</TableCell>
                          <TableCell>
                            <Badge variant={p.status === "PAID" ? "default" : (p.status === "PENDING" ? "secondary" : "destructive")}>
                              {p.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{p.razorpayOrderId}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* MANUAL ENTRY TAB */}
            <TabsContent value="manual" className="mt-6">
              <Card className="max-w-2xl">
                <CardHeader>
                  <CardTitle>Log Cash Payment</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleManualPayment} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Select Student</Label>
                      <Select value={manualStudentId} onValueChange={setManualStudentId}>
                        <SelectTrigger><SelectValue placeholder="Search student" /></SelectTrigger>
                        <SelectContent className="max-h-64">
                          {studentsList.map(st => (
                            <SelectItem key={st.id} value={st.id}>{st.user?.name} ({st.rollNo})</SelectItem>
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
                      <Input required type="number" value={manualAmount} onChange={e => setManualAmount(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Cashier Note</Label>
                      <Input required value={manualNote} onChange={e => setManualNote(e.target.value)} placeholder="e.g. Cash received by office" />
                    </div>
                    <Button type="submit" className="w-full">Log Payment (PAID)</Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* REPORTS TAB */}
            <TabsContent value="reports" className="mt-6">
              <Card>
                <CardHeader className="flex flex-row justify-between">
                  <CardTitle>Monthly Analytics</CardTitle>
                  <Button onClick={exportPDF}>Export PDF</Button>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Click "Export PDF" to download the generated analytics report containing collections vs pendings grouped month by month.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Structure Modal */}
      <Dialog open={isStructModalOpen} onOpenChange={setStructModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Fee Structure</DialogTitle></DialogHeader>
          <form onSubmit={handleAddStructure} className="space-y-4">
            <div className="space-y-2">
              <Label>Class</Label>
              <Input required value={structForm.class} onChange={e => setStructForm({...structForm, class: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Fee Type</Label>
              <Input required value={structForm.type} onChange={e => setStructForm({...structForm, type: e.target.value})} placeholder="e.g. Annual Charges"/>
            </div>
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input required type="number" value={structForm.amount} onChange={e => setStructForm({...structForm, amount: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input required type="date" value={structForm.dueDate} onChange={e => setStructForm({...structForm, dueDate: e.target.value})} />
            </div>
            <DialogFooter>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
