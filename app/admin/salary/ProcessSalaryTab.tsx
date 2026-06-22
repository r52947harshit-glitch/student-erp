"use client"

import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ChevronDown, ChevronUp } from "lucide-react"

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]

interface SalaryRow {
  teacher: { id: string; name: string; employeeId: string; photoUrl: string | null }
  salaryConfig: { baseSalary: number; bankName: string; bankAccountMasked: string } | null
  breakdown: {
    baseSalary: number; totalWorkingDays: number; presentDays: number; halfDays: number
    paidLeaveDays: number; unpaidLeaveDays: number; absentDays: number
    effectivePresentDays: number; deductionAmount: number; netSalary: number
  } | null
  existingPayment: { id: string; status: string; netSalary: number } | null
  razorpayReady: boolean
}

export function ProcessSalaryTab() {
  const now = new Date()
  const [month, setMonth] = useState((now.getMonth() + 1).toString())
  const [year, setYear] = useState(now.getFullYear().toString())
  const [rows, setRows] = useState<SalaryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<SalaryRow | null>(null)
  const [bulkPaying, setBulkPaying] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 })
  const { toast } = useToast()

  const calculate = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/salary/calculate?month=${month}&year=${year}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRows(data)
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const payTeacher = async (row: SalaryRow) => {
    setPayingId(row.teacher.id)
    setConfirmDialog(null)
    try {
      const res = await fetch("/api/salary/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId: row.teacher.id, month: parseInt(month), year: parseInt(year) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: "Success", description: `₹${data.netSalary} paid to ${row.teacher.name}` })
      // Update row status locally
      setRows(prev => prev.map(r =>
        r.teacher.id === row.teacher.id
          ? { ...r, existingPayment: { id: data.paymentId, status: "PAID", netSalary: data.netSalary } }
          : r
      ))
    } catch (e: any) {
      toast({ title: "Payment Failed", description: e.message, variant: "destructive" })
      setRows(prev => prev.map(r =>
        r.teacher.id === row.teacher.id
          ? { ...r, existingPayment: { id: "", status: "FAILED", netSalary: r.breakdown?.netSalary || 0 } }
          : r
      ))
    } finally {
      setPayingId(null)
    }
  }

  const payAllPending = async () => {
    const pending = rows.filter(r => r.razorpayReady && r.breakdown && (!r.existingPayment || r.existingPayment.status === "PENDING" || r.existingPayment.status === "FAILED"))
    if (pending.length === 0) return
    setBulkPaying(true)
    setBulkProgress({ current: 0, total: pending.length })
    for (let i = 0; i < pending.length; i++) {
      setBulkProgress({ current: i + 1, total: pending.length })
      await payTeacher(pending[i])
    }
    setBulkPaying(false)
    toast({ title: "Bulk Payment Complete", description: `Processed ${pending.length} salary payments` })
  }

  const pendingCount = rows.filter(r => r.razorpayReady && r.breakdown && (!r.existingPayment || r.existingPayment.status === "PENDING" || r.existingPayment.status === "FAILED")).length

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Process Salary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1">
            <label className="text-sm font-medium">Month</label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Year</label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>{[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button onClick={calculate} disabled={loading}>{loading ? "Calculating..." : "Calculate Salaries"}</Button>
          {pendingCount > 1 && (
            <Button onClick={payAllPending} disabled={bulkPaying} variant="default">
              {bulkPaying ? `Paying ${bulkProgress.current}/${bulkProgress.total}...` : `Pay All Pending (${pendingCount})`}
            </Button>
          )}
        </div>

        {loading && <LoadingSpinner />}

        {!loading && rows.length > 0 && (
          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-3 font-semibold">Teacher</th>
                  <th className="text-right p-3 font-semibold">Present</th>
                  <th className="text-right p-3 font-semibold">Half</th>
                  <th className="text-right p-3 font-semibold">P.Leave</th>
                  <th className="text-right p-3 font-semibold">Absent</th>
                  <th className="text-right p-3 font-semibold">Deduction</th>
                  <th className="text-right p-3 font-semibold">Net Salary</th>
                  <th className="text-center p-3 font-semibold">Status</th>
                  <th className="text-center p-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <>
                    <tr key={r.teacher.id} className="border-b hover:bg-slate-50/50 cursor-pointer" onClick={() => setExpandedRow(expandedRow === r.teacher.id ? null : r.teacher.id)}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {expandedRow === r.teacher.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          <span className="font-medium">{r.teacher.name}</span>
                          <span className="text-xs text-muted-foreground">{r.teacher.employeeId}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right">{r.breakdown?.presentDays ?? "—"}</td>
                      <td className="p-3 text-right">{r.breakdown?.halfDays ?? "—"}</td>
                      <td className="p-3 text-right">{r.breakdown?.paidLeaveDays ?? "—"}</td>
                      <td className="p-3 text-right">{r.breakdown?.absentDays ?? "—"}</td>
                      <td className="p-3 text-right text-red-600">{r.breakdown ? `-₹${r.breakdown.deductionAmount.toLocaleString()}` : "—"}</td>
                      <td className="p-3 text-right font-bold">{r.breakdown ? `₹${r.breakdown.netSalary.toLocaleString()}` : "—"}</td>
                      <td className="p-3 text-center">
                        {r.existingPayment?.status === "PAID" && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Paid ✅</span>}
                        {r.existingPayment?.status === "PROCESSING" && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Processing 🔄</span>}
                        {r.existingPayment?.status === "FAILED" && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Failed ❌</span>}
                        {(!r.existingPayment || r.existingPayment.status === "PENDING") && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Pending ⏳</span>}
                      </td>
                      <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                        {r.existingPayment?.status === "PAID" ? null : payingId === r.teacher.id ? (
                          <Button size="sm" disabled>Processing...</Button>
                        ) : !r.razorpayReady ? (
                          <Button size="sm" variant="outline" disabled title="Configure bank details first">No Bank</Button>
                        ) : !r.breakdown ? (
                          <Button size="sm" variant="outline" disabled>No Config</Button>
                        ) : (
                          <Button size="sm" onClick={() => setConfirmDialog(r)}>Pay Now</Button>
                        )}
                      </td>
                    </tr>
                    {expandedRow === r.teacher.id && r.breakdown && (
                      <tr key={`${r.teacher.id}-detail`}>
                        <td colSpan={9} className="p-4 bg-slate-50/80">
                          <div className="max-w-sm mx-auto p-4 bg-white rounded-lg border shadow-sm text-sm space-y-2">
                            <h4 className="font-bold text-center mb-3">Salary Breakdown — {MONTHS[parseInt(month) - 1]} {year}</h4>
                            <div className="flex justify-between"><span>Base Salary:</span><span className="font-medium">₹{r.breakdown.baseSalary.toLocaleString()}</span></div>
                            <div className="flex justify-between"><span>Working Days:</span><span>{r.breakdown.totalWorkingDays}</span></div>
                            <div className="flex justify-between"><span>Per Day Rate:</span><span>₹{(r.breakdown.baseSalary / r.breakdown.totalWorkingDays).toFixed(0)}</span></div>
                            <hr />
                            <div className="flex justify-between text-green-700"><span>Present ({r.breakdown.presentDays}d):</span><span>+₹{((r.breakdown.baseSalary / r.breakdown.totalWorkingDays) * r.breakdown.presentDays).toFixed(0)}</span></div>
                            <div className="flex justify-between text-blue-600"><span>Paid Leave ({r.breakdown.paidLeaveDays}d):</span><span>+₹{((r.breakdown.baseSalary / r.breakdown.totalWorkingDays) * r.breakdown.paidLeaveDays).toFixed(0)}</span></div>
                            <div className="flex justify-between text-orange-600"><span>Half Day ({r.breakdown.halfDays}d):</span><span>+₹{((r.breakdown.baseSalary / r.breakdown.totalWorkingDays) * r.breakdown.halfDays * 0.5).toFixed(0)}</span></div>
                            <div className="flex justify-between text-red-600"><span>Absent ({r.breakdown.absentDays}d):</span><span>-₹{((r.breakdown.baseSalary / r.breakdown.totalWorkingDays) * r.breakdown.absentDays).toFixed(0)}</span></div>
                            <div className="flex justify-between text-gray-600"><span>Unpaid Leave ({r.breakdown.unpaidLeaveDays}d):</span><span>-₹{((r.breakdown.baseSalary / r.breakdown.totalWorkingDays) * r.breakdown.unpaidLeaveDays).toFixed(0)}</span></div>
                            <hr />
                            <div className="flex justify-between font-bold text-lg"><span>Net Salary:</span><span>₹{r.breakdown.netSalary.toLocaleString()}</span></div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Confirm Dialog */}
        {confirmDialog && (
          <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto w-full max-w-lg mx-4 sm:mx-auto">
              <DialogHeader><DialogTitle>Confirm Salary Payment</DialogTitle></DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Teacher:</span><span className="font-medium">{confirmDialog.teacher.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Month:</span><span className="font-medium">{MONTHS[parseInt(month) - 1]} {year}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Net Salary:</span><span className="font-bold text-lg">₹{confirmDialog.breakdown?.netSalary.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Bank:</span><span>{confirmDialog.salaryConfig?.bankAccountMasked} ({confirmDialog.salaryConfig?.bankName})</span></div>
                <p className="text-xs text-muted-foreground border-t pt-3 mt-3">This will transfer money directly to the teacher&apos;s bank account. This action cannot be undone.</p>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setConfirmDialog(null)}>Cancel</Button>
                  <Button className="flex-1" onClick={() => payTeacher(confirmDialog)}>Confirm &amp; Pay</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  )
}
