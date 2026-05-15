"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]

interface PaymentRecord {
  id: string
  teacherName: string
  employeeId: string
  month: number
  year: number
  baseSalary: number
  deductionAmount: number
  netSalary: number
  status: string
  razorpayPayoutId: string | null
  failureReason: string | null
  processedAt: string | null
  createdAt: string
}

interface Summary {
  totalPaid: number; totalPending: number; totalFailed: number
  paidCount: number; pendingCount: number; failedCount: number; totalStaff: number
}

export function PaymentHistoryTab() {
  const now = new Date()
  const [month, setMonth] = useState((now.getMonth() + 1).toString())
  const [year, setYear] = useState(now.getFullYear().toString())
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [search, setSearch] = useState("")
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const fetchHistory = async () => {
    setLoading(true)
    try {
      let url = `/api/salary/history?month=${month}&year=${year}`
      if (statusFilter !== "ALL") url += `&status=${statusFilter}`
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPayments(data.payments)
      setSummary(data.summary)
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchHistory() }, [month, year, statusFilter])

  // Auto-refresh PROCESSING statuses
  useEffect(() => {
    const hasProcessing = payments.some(p => p.status === "PROCESSING")
    if (!hasProcessing) return
    const interval = setInterval(fetchHistory, 10000)
    return () => clearInterval(interval)
  }, [payments])

  const exportCSV = () => {
    const header = "Teacher,Employee ID,Month,Year,Base Salary,Deduction,Net Salary,Status,Razorpay ID,Processed At\n"
    const rows = payments.map(p =>
      `"${p.teacherName}","${p.employeeId}",${p.month},${p.year},${p.baseSalary},${p.deductionAmount},${p.netSalary},${p.status},"${p.razorpayPayoutId || ""}","${p.processedAt || ""}"`
    ).join("\n")
    const blob = new Blob([header + rows], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `salary_history_${MONTHS[parseInt(month) - 1]}_${year}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = search
    ? payments.filter(p => p.teacherName.toLowerCase().includes(search.toLowerCase()) || p.employeeId.toLowerCase().includes(search.toLowerCase()))
    : payments

  const statusBadge = (status: string, reason?: string | null) => {
    switch (status) {
      case "PAID": return <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Paid ✅</span>
      case "PENDING": return <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Pending ⏳</span>
      case "PROCESSING": return <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full animate-pulse">Processing 🔄</span>
      case "FAILED": return <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full" title={reason || ""}>Failed ❌</span>
      default: return <span className="text-xs">{status}</span>
    }
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Summary Card */}
      {summary && (
        <Card className="bg-gradient-to-r from-slate-50 to-blue-50 border-blue-100">
          <CardContent className="pt-6">
            <h4 className="font-bold mb-3">{MONTHS[parseInt(month) - 1]} {year} Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-muted-foreground">Total Paid:</span><p className="font-bold text-green-700">₹{summary.totalPaid.toLocaleString()} ({summary.paidCount} ✅)</p></div>
              <div><span className="text-muted-foreground">Pending:</span><p className="font-bold text-yellow-700">₹{summary.totalPending.toLocaleString()} ({summary.pendingCount} ⏳)</p></div>
              <div><span className="text-muted-foreground">Failed:</span><p className="font-bold text-red-700">₹{summary.totalFailed.toLocaleString()} ({summary.failedCount} ❌)</p></div>
              <div><span className="text-muted-foreground">Total Staff:</span><p className="font-bold">{summary.totalStaff}</p></div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Payment History</CardTitle>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={payments.length === 0}>Export CSV</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium">Month</label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Year</label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>{[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PROCESSING">Processing</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 flex-1 min-w-[200px]">
              <label className="text-xs font-medium">Search</label>
              <Input placeholder="Teacher name or ID..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {loading && <LoadingSpinner />}

          {!loading && filtered.length > 0 && (
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left p-3 font-semibold">Teacher</th>
                    <th className="text-left p-3 font-semibold">Month</th>
                    <th className="text-right p-3 font-semibold">Base</th>
                    <th className="text-right p-3 font-semibold">Deduction</th>
                    <th className="text-right p-3 font-semibold">Net Salary</th>
                    <th className="text-left p-3 font-semibold">Payout ID</th>
                    <th className="text-center p-3 font-semibold">Status</th>
                    <th className="text-left p-3 font-semibold">Processed</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} className="border-b hover:bg-slate-50/50">
                      <td className="p-3">
                        <div className="font-medium">{p.teacherName}</div>
                        <div className="text-xs text-muted-foreground">{p.employeeId}</div>
                      </td>
                      <td className="p-3">{MONTHS[p.month - 1]} {p.year}</td>
                      <td className="p-3 text-right">₹{p.baseSalary.toLocaleString()}</td>
                      <td className="p-3 text-right text-red-600">-₹{p.deductionAmount.toLocaleString()}</td>
                      <td className="p-3 text-right font-bold">₹{p.netSalary.toLocaleString()}</td>
                      <td className="p-3 text-xs text-muted-foreground font-mono">{p.razorpayPayoutId || "—"}</td>
                      <td className="p-3 text-center">{statusBadge(p.status, p.failureReason)}</td>
                      <td className="p-3 text-xs text-muted-foreground">{p.processedAt ? new Date(p.processedAt).toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-8">No payment records found for this period.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
