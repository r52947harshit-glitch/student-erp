"use client"

import { useState, useEffect, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import Script from "next/script"
import { jsPDF } from "jspdf"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { CreditCard, Download, Loader2, CheckCircle2, Clock, XCircle, Receipt } from "lucide-react"

declare global {
  interface Window {
    Razorpay: any
  }
}

export default function PayFee() {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [pendingFees, setPendingFees] = useState<any[]>([])
  const [paidFees, setPaidFees] = useState<any[]>([])
  const [studentInfo, setStudentInfo] = useState<any>(null)
  const [payingType, setPayingType] = useState<string | null>(null)
  const [pollingOrderId, setPollingOrderId] = useState<string | null>(null)
  const [paymentSuccess, setPaymentSuccess] = useState<any>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadData()
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [feeRes, dashRes] = await Promise.all([
        fetch("/api/payments/history"),
        fetch("/api/student/dashboard")
      ])
      const feeData = await feeRes.json()
      const dashData = await dashRes.json()

      setPendingFees(feeData.pendingFees || [])
      setPaidFees(feeData.paidFees || [])
      setStudentInfo(dashData.student || null)
    } catch {
      toast({ title: "Error", description: "Failed to load fee data.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  // ── RAZORPAY FLOW ───────────────────────────────────────────────────
  const handlePayNow = async (feeType: string, amount: number) => {
    setPayingType(feeType)

    try {
      // Step 2 — create order on server
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, type: feeType })
      })

      const orderData = await res.json()
      if (!res.ok) throw new Error(orderData.error || "Order creation failed")

      // Step 3 — open Razorpay checkout popup
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "School ERP — Fee Portal",
        description: `${feeType} payment`,
        order_id: orderData.orderId,
        handler: () => {
          // Step 6 — begin polling (do NOT trust this callback for status)
          startPolling(orderData.orderId)
        },
        modal: {
          ondismiss: () => {
            setPayingType(null)
            toast({ title: "Cancelled", description: "Payment was dismissed." })
          }
        },
        prefill: {
          name: studentInfo?.name || "",
          email: studentInfo?.email || "",
        },
        theme: { color: "#2563eb" }
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Payment failed to initialize", variant: "destructive" })
      setPayingType(null)
    }
  }

  // ── POLLING ─────────────────────────────────────────────────────────
  const startPolling = (orderId: string) => {
    setPollingOrderId(orderId)
    let attempts = 0
    const maxAttempts = 40 // ~2 minutes

    pollingRef.current = setInterval(async () => {
      attempts++
      try {
        const res = await fetch(`/api/payments/status/${orderId}`)
        const data = await res.json()

        if (data.status === "PAID") {
          clearInterval(pollingRef.current!)
          pollingRef.current = null
          setPollingOrderId(null)
          setPayingType(null)

          setPaymentSuccess(data)
          toast({ title: "Payment Verified ✅", description: `₹${data.amount} received for ${data.type}` })
          loadData() // refresh
        } else if (data.status === "FAILED" || attempts >= maxAttempts) {
          clearInterval(pollingRef.current!)
          pollingRef.current = null
          setPollingOrderId(null)
          setPayingType(null)
          toast({ title: "Payment Issue", description: "Could not verify payment. It may still process — check back shortly.", variant: "destructive" })
        }
      } catch {
        // network hiccup — keep polling
      }
    }, 3000)
  }

  // ── PDF RECEIPT ─────────────────────────────────────────────────────
  const generateReceipt = (payment: any) => {
    const doc = new jsPDF()

    // Header
    doc.setFillColor(37, 99, 235)
    doc.rect(0, 0, 210, 40, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.text("School ERP", 15, 20)
    doc.setFontSize(10)
    doc.text("Fee Payment Receipt", 15, 30)

    // Student Info
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    const y = 55
    doc.text(`Student Name: ${studentInfo?.name || "N/A"}`, 15, y)
    doc.text(`Class: ${studentInfo?.class || "N/A"}-${studentInfo?.section || ""}`, 15, y + 8)
    doc.text(`Roll No: ${studentInfo?.rollNo || "N/A"}`, 15, y + 16)

    // Divider
    doc.setDrawColor(200, 200, 200)
    doc.line(15, y + 24, 195, y + 24)

    // Payment Details
    const py = y + 34
    doc.setFontSize(14)
    doc.setTextColor(37, 99, 235)
    doc.text("Payment Details", 15, py)
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(11)
    doc.text(`Fee Type: ${payment.type}`, 15, py + 12)
    doc.text(`Amount Paid: ₹${payment.amount}`, 15, py + 20)
    doc.text(`Payment ID: ${payment.razorpayPaymentId || payment.razorpayOrderId || "N/A"}`, 15, py + 28)
    doc.text(`Date: ${payment.verifiedAt ? format(new Date(payment.verifiedAt), "PPpp") : format(new Date(payment.createdAt), "PPpp")}`, 15, py + 36)
    doc.text(`Status: PAID`, 15, py + 44)

    // Footer
    doc.setFontSize(9)
    doc.setTextColor(128, 128, 128)
    doc.text("This is a computer-generated receipt and does not require a physical signature.", 15, 270)
    doc.text(`Generated on ${format(new Date(), "PPpp")}`, 15, 277)

    doc.save(`Receipt_${payment.type}_${studentInfo?.rollNo || "student"}.pdf`)
  }

  // ── RENDER ──────────────────────────────────────────────────────────
  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="space-y-6 animate-in fade-in duration-300 max-w-5xl mx-auto">
        <PageHeader 
          title="Fee Portal" 
          description="Manage your fee payments securely and download digital receipts."
        />

        {/* Success banner */}
        {paymentSuccess && (
          <Card className="border-emerald-200 bg-emerald-50 shadow-md animate-in slide-in-from-top-4 duration-500">
            <CardContent className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-6 text-center sm:text-left">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mx-auto sm:mx-0">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-emerald-900 text-lg">Payment Verified Successfully!</h3>
                <p className="text-sm text-emerald-700 mt-1 font-medium">₹{paymentSuccess.amount.toLocaleString('en-IN')} for {paymentSuccess.type} has been confirmed and updated in your records.</p>
              </div>
              <Button className="mt-4 sm:mt-0 bg-emerald-600 hover:bg-emerald-700 shadow-sm" onClick={() => generateReceipt(paymentSuccess)}>
                <Download className="w-4 h-4 mr-2" />
                Download Receipt
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Polling banner */}
        {pollingOrderId && (
          <Card className="border-blue-200 bg-blue-50 shadow-md">
            <CardContent className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-6 text-center sm:text-left">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mx-auto sm:mx-0">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-blue-900 text-lg">Verifying Payment Transaction…</h3>
                <p className="text-sm text-blue-700 mt-1 font-medium">Waiting for bank confirmation. Please don't close this window or refresh the page.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="py-24 flex justify-center"><LoadingSpinner /></div>
        ) : (
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full sm:w-auto grid-cols-2 mb-6 p-1 bg-blue-50 text-blue-800 border border-blue-100 rounded-lg">
              <TabsTrigger value="pending" className="data-[state=active]:bg-white data-[state=active]:text-blue-900 data-[state=active]:shadow-sm rounded-md transition-all">
                Pending Fees {pendingFees.length > 0 && <Badge className="ml-2 bg-rose-500 text-white border-0">{pendingFees.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-white data-[state=active]:text-blue-900 data-[state=active]:shadow-sm rounded-md transition-all">
                Payment History
              </TabsTrigger>
            </TabsList>

            {/* ── PENDING FEES ── */}
            <TabsContent value="pending" className="mt-0">
              <Card className="border-blue-100 shadow-sm overflow-hidden">
                <CardHeader className="bg-blue-50/50 border-b border-blue-50 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-blue-950">Outstanding Fees</CardTitle>
                      <CardDescription>Click "Pay Now" to complete your payments securely.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  {pendingFees.length === 0 ? (
                    <div className="py-16 bg-white">
                      <EmptyState 
                        icon={CheckCircle2}
                        title="All fees cleared!"
                        description="You have no pending fee dues at the moment."
                      />
                    </div>
                  ) : (
                    <Table className="min-w-[600px]">
                      <TableHeader className="bg-slate-50/80">
                        <TableRow className="border-b border-slate-200">
                          <TableHead className="font-semibold text-slate-700 pl-6 w-[200px]">Fee Type</TableHead>
                          <TableHead className="font-semibold text-slate-700">Amount</TableHead>
                          <TableHead className="font-semibold text-slate-700">Due Date</TableHead>
                          <TableHead className="font-semibold text-slate-700">Status</TableHead>
                          <TableHead className="text-right pr-6 font-semibold text-slate-700">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-slate-100">
                        {pendingFees.map((fee, idx) => (
                          <TableRow key={idx} className="hover:bg-slate-50/60 transition-colors">
                            <TableCell className="font-semibold text-slate-900 pl-6">{fee.type}</TableCell>
                            <TableCell className="font-bold text-slate-900 text-base">₹{fee.amount.toLocaleString('en-IN')}</TableCell>
                            <TableCell className="text-slate-600 font-medium">{format(new Date(fee.dueDate), "PP")}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold tracking-wider uppercase bg-rose-50 text-rose-700 border border-rose-200">
                                <Clock className="w-3 h-3" />
                                Pending
                              </span>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 shadow-sm"
                                disabled={payingType === fee.type || !!pollingOrderId}
                                onClick={() => handlePayNow(fee.type, fee.amount)}
                              >
                                {payingType === fee.type ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <CreditCard className="w-4 h-4 mr-2" />
                                    Pay Now
                                  </>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── PAYMENT HISTORY ── */}
            <TabsContent value="history" className="mt-0">
              <Card className="border-blue-100 shadow-sm overflow-hidden">
                <CardHeader className="bg-blue-50/50 border-b border-blue-50 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-blue-950">Transaction History</CardTitle>
                      <CardDescription>All your completed payments and downloadable receipts.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  {paidFees.length === 0 ? (
                    <div className="py-16 bg-white">
                      <EmptyState 
                        icon={Receipt}
                        title="No payment history"
                        description="You haven't made any fee payments through the portal yet."
                      />
                    </div>
                  ) : (
                    <Table className="min-w-[600px]">
                      <TableHeader className="bg-slate-50/80">
                        <TableRow className="border-b border-slate-200">
                          <TableHead className="font-semibold text-slate-700 pl-6">Payment Date</TableHead>
                          <TableHead className="font-semibold text-slate-700">Fee Type</TableHead>
                          <TableHead className="font-semibold text-slate-700">Amount Paid</TableHead>
                          <TableHead className="font-semibold text-slate-700">Status</TableHead>
                          <TableHead className="text-right pr-6 font-semibold text-slate-700">Receipt</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-slate-100">
                        {paidFees.map((payment, idx) => (
                          <TableRow key={idx} className="hover:bg-slate-50/60 transition-colors">
                            <TableCell className="text-slate-600 font-medium pl-6">{format(new Date(payment.verifiedAt || payment.createdAt), "PP")}</TableCell>
                            <TableCell className="font-semibold text-slate-900">{payment.type}</TableCell>
                            <TableCell className="font-bold text-emerald-700 text-base">₹{payment.amount.toLocaleString('en-IN')}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                Successful
                              </span>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <Button variant="outline" size="sm" className="text-blue-700 border-blue-200 hover:bg-blue-50" onClick={() => generateReceipt(payment)}>
                                <Download className="w-4 h-4 mr-2" />
                                PDF
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </>
  )
}
