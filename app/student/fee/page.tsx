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
import { CreditCard, Download, Loader2, CheckCircle2, Clock, XCircle } from "lucide-react"

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
  if (loading) return <LoadingSpinner />

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight text-blue-900">Fee Payment</h2>

        {/* Success banner */}
        {paymentSuccess && (
          <Card className="border-green-200 bg-green-50 shadow-md">
            <CardContent className="flex items-center gap-4 p-6">
              <CheckCircle2 className="w-10 h-10 text-green-600 shrink-0" />
              <div className="flex-1">
                <h3 className="font-bold text-green-900 text-lg">Payment Verified Successfully!</h3>
                <p className="text-sm text-green-700 mt-1">₹{paymentSuccess.amount} for {paymentSuccess.type} has been confirmed.</p>
              </div>
              <Button variant="outline" className="border-green-300 text-green-700 hover:bg-green-100" onClick={() => generateReceipt(paymentSuccess)}>
                <Download className="w-4 h-4 mr-2" />
                Download Receipt
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Polling banner */}
        {pollingOrderId && (
          <Card className="border-blue-200 bg-blue-50 animate-pulse">
            <CardContent className="flex items-center gap-4 p-6">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin shrink-0" />
              <div>
                <h3 className="font-bold text-blue-900">Verifying Payment…</h3>
                <p className="text-sm text-blue-700">Waiting for bank confirmation. This usually takes a few seconds.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending">
              Pending Fees {pendingFees.length > 0 && <Badge className="ml-2 bg-red-500">{pendingFees.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="history">Payment History</TabsTrigger>
          </TabsList>

          {/* ── PENDING FEES ── */}
          <TabsContent value="pending">
            <Card className="border-blue-100">
              <CardHeader className="bg-blue-50/50">
                <CardTitle className="text-lg">Outstanding Fees</CardTitle>
                <CardDescription>Click "Pay Now" to complete payment via Razorpay</CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fee Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingFees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          <CheckCircle2 className="w-8 h-8 mx-auto text-green-500 mb-2" />
                          All fees cleared! No pending dues.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingFees.map((fee, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{fee.type}</TableCell>
                          <TableCell className="font-bold">₹{fee.amount.toLocaleString()}</TableCell>
                          <TableCell>{format(new Date(fee.dueDate), "PP")}</TableCell>
                          <TableCell>
                            <Badge variant="destructive" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                              disabled={payingType === fee.type || !!pollingOrderId}
                              onClick={() => handlePayNow(fee.type, fee.amount)}
                            >
                              {payingType === fee.type ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <CreditCard className="w-4 h-4 mr-1" />
                                  Pay Now
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── PAYMENT HISTORY ── */}
          <TabsContent value="history">
            <Card className="border-blue-100">
              <CardHeader className="bg-blue-50/50">
                <CardTitle className="text-lg">Transaction History</CardTitle>
                <CardDescription>All completed payments with downloadable receipts</CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Fee Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Receipt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paidFees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No payment records found yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paidFees.map((payment, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{format(new Date(payment.verifiedAt || payment.createdAt), "PP")}</TableCell>
                          <TableCell className="font-medium">{payment.type}</TableCell>
                          <TableCell className="font-bold">₹{payment.amount.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Paid
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800" onClick={() => generateReceipt(payment)}>
                              <Download className="w-4 h-4 mr-1" />
                              PDF
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
