"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Eye, EyeOff, AlertTriangle } from "lucide-react"

interface TeacherConfig {
  id: string
  name: string
  email: string
  employeeId: string
  phone: string
  photoUrl: string | null
  salaryConfig: {
    baseSalary: number
    accountHolderName: string
    bankAccountMasked: string
    ifscCode: string
    bankName: string
    razorpayContactId: string | null
    razorpayFundAccountId: string | null
  } | null
}

export function SalarySetupTab() {
  const [teachers, setTeachers] = useState<TeacherConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherConfig | null>(null)
  const { toast } = useToast()

  const fetchTeachers = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/salary/config")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTeachers(data)
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTeachers() }, [])

  const openConfigModal = (teacher: TeacherConfig) => {
    setSelectedTeacher(teacher)
    setModalOpen(true)
  }

  if (loading) return <LoadingSpinner />

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Salary Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-3 font-semibold">Teacher</th>
                <th className="text-left p-3 font-semibold">Employee ID</th>
                <th className="text-left p-3 font-semibold">Base Salary</th>
                <th className="text-left p-3 font-semibold">Bank</th>
                <th className="text-left p-3 font-semibold">Razorpay Status</th>
                <th className="text-left p-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map(t => (
                <tr key={t.id} className="border-b hover:bg-slate-50/50">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {t.photoUrl ? (
                        <img src={t.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">{t.name.charAt(0)}</div>
                      )}
                      <span className="font-medium">{t.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{t.employeeId}</td>
                  <td className="p-3 font-medium">
                    {t.salaryConfig ? `₹${t.salaryConfig.baseSalary.toLocaleString()}` : "—"}
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">
                    {t.salaryConfig ? `${t.salaryConfig.bankAccountMasked} (${t.salaryConfig.bankName})` : "—"}
                  </td>
                  <td className="p-3">
                    {t.salaryConfig?.razorpayFundAccountId ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">✅ Ready</span>
                    ) : t.salaryConfig ? (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">⚠️ Setup Pending</span>
                    ) : (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">❌ Not Configured</span>
                    )}
                  </td>
                  <td className="p-3">
                    <Button size="sm" variant="outline" onClick={() => openConfigModal(t)}>
                      {t.salaryConfig ? "Edit" : "Configure"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedTeacher && (
          <ConfigureModal
            open={modalOpen}
            onClose={() => { setModalOpen(false); setSelectedTeacher(null) }}
            teacher={selectedTeacher}
            onSaved={fetchTeachers}
          />
        )}
      </CardContent>
    </Card>
  )
}

function ConfigureModal({ open, onClose, teacher, onSaved }: {
  open: boolean
  onClose: () => void
  teacher: TeacherConfig
  onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [showAccount, setShowAccount] = useState(false)
  const { toast } = useToast()

  const [form, setForm] = useState({
    baseSalary: teacher.salaryConfig?.baseSalary?.toString() || "",
    accountHolderName: teacher.salaryConfig?.accountHolderName || "",
    bankAccountNumber: "",
    confirmAccountNumber: "",
    ifscCode: teacher.salaryConfig?.ifscCode || "",
    bankName: teacher.salaryConfig?.bankName || "",
  })

  const perDay = form.baseSalary ? (parseFloat(form.baseSalary) / 26).toFixed(0) : "0"
  const ifscValid = /^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifscCode)
  const accountsMatch = form.bankAccountNumber === form.confirmAccountNumber && form.bankAccountNumber.length >= 9

  const handleSave = async () => {
    if (!accountsMatch) {
      toast({ title: "Error", description: "Account numbers do not match", variant: "destructive" })
      return
    }
    if (!ifscValid) {
      toast({ title: "Error", description: "Invalid IFSC code format", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/salary/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: teacher.id,
          baseSalary: parseFloat(form.baseSalary),
          accountHolderName: form.accountHolderName,
          bankAccountNumber: form.bankAccountNumber,
          ifscCode: form.ifscCode,
          bankName: form.bankName,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (data.warning) {
        toast({ title: "Warning", description: data.warning, variant: "destructive" })
      } else {
        toast({ title: "Success", description: "Salary configured and Razorpay registered ✅" })
      }
      onSaved()
      onClose()
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Salary — {teacher.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800 flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Bank details are sensitive. Double-check account number before saving. Incorrect details will cause failed salary transfers.</span>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Salary Details</h4>
            <div className="space-y-1">
              <Label>Base Monthly Salary (₹)</Label>
              <Input type="number" value={form.baseSalary} onChange={e => setForm({ ...form, baseSalary: e.target.value })} placeholder="e.g. 25000" />
              {form.baseSalary && <p className="text-xs text-muted-foreground">≈ ₹{perDay} per day (based on ~26 working days)</p>}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Bank Details</h4>
            <div className="space-y-1">
              <Label>Account Holder Name</Label>
              <Input value={form.accountHolderName} onChange={e => setForm({ ...form, accountHolderName: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Bank Account Number</Label>
              <div className="relative">
                <Input
                  type={showAccount ? "text" : "password"}
                  value={form.bankAccountNumber}
                  onChange={e => setForm({ ...form, bankAccountNumber: e.target.value.replace(/\D/g, "") })}
                  placeholder="9-18 digit account number"
                />
                <button type="button" onClick={() => setShowAccount(!showAccount)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showAccount ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Confirm Account Number</Label>
              <Input
                type="password"
                value={form.confirmAccountNumber}
                onChange={e => setForm({ ...form, confirmAccountNumber: e.target.value.replace(/\D/g, "") })}
              />
              {form.confirmAccountNumber && !accountsMatch && <p className="text-xs text-red-500">Account numbers do not match</p>}
              {accountsMatch && form.bankAccountNumber && <p className="text-xs text-green-600">✓ Accounts match</p>}
            </div>
            <div className="space-y-1">
              <Label>IFSC Code</Label>
              <Input
                value={form.ifscCode}
                onChange={e => setForm({ ...form, ifscCode: e.target.value.toUpperCase() })}
                placeholder="e.g. HDFC0001234"
                maxLength={11}
              />
              {form.ifscCode && (ifscValid ? <p className="text-xs text-green-600">✓ Valid format</p> : <p className="text-xs text-red-500">Invalid IFSC format</p>)}
            </div>
            <div className="space-y-1">
              <Label>Bank Name</Label>
              <Input value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} placeholder="e.g. HDFC Bank" />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving || !accountsMatch || !ifscValid || !form.baseSalary} className="w-full">
            {saving ? "Registering with Razorpay..." : "Save & Register"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
