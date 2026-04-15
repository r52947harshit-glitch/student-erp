"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { Download, FileSpreadsheet } from "lucide-react"

const EXAM_TYPES = ["UNIT_TEST", "HALF_YEARLY", "ANNUAL"]
const EXAM_LABELS: Record<string, string> = {
  "UNIT_TEST": "Unit Test",
  "HALF_YEARLY": "Half Yearly",
  "ANNUAL": "Annual Exam"
}

function getGrade(percentage: number) {
  if (percentage >= 90) return "A+"
  if (percentage >= 80) return "A"
  if (percentage >= 70) return "B"
  if (percentage >= 60) return "C"
  if (percentage >= 50) return "D"
  return "F"
}

function getGradeColor(grade: string) {
  switch (grade) {
    case "A+": case "A": return "bg-green-100 text-green-800"
    case "B": return "bg-blue-100 text-blue-800"
    case "C": return "bg-yellow-100 text-yellow-800"
    case "D": return "bg-orange-100 text-orange-800"
    case "F": return "bg-red-100 text-red-800"
    default: return "bg-slate-100 text-slate-800"
  }
}

export default function StudentResults() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("UNIT_TEST")
  const [results, setResults] = useState<any[]>([])
  const [studentInfo, setStudentInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadResults(activeTab) }, [activeTab])

  const loadResults = async (examType: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/results/student?exam=${examType}`)
      const data = await res.json()
      setResults(data.results || [])
      if (data.student) setStudentInfo(data.student)
    } catch {
      toast({ title: "Error", description: "Failed to load results", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  // ── Computed values ─────────────────────────────────────────────────
  const enrichedResults = results.map(r => {
    const pct = r.totalMarks > 0 ? (r.marksObtained / r.totalMarks) * 100 : 0
    return { ...r, percentage: pct, grade: getGrade(pct) }
  })

  const totalObtained = enrichedResults.reduce((s, r) => s + r.marksObtained, 0)
  const totalMax = enrichedResults.reduce((s, r) => s + r.totalMarks, 0)
  const overallPercentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0
  const overallGrade = getGrade(overallPercentage)
  const isPassed = overallPercentage >= 33

  // ── PDF Report Card ─────────────────────────────────────────────────
  const downloadReportCard = () => {
    const doc = new jsPDF()

    // Header
    doc.setFillColor(37, 99, 235)
    doc.rect(0, 0, 210, 45, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.text("School ERP", 15, 22)
    doc.setFontSize(12)
    doc.text(`Report Card — ${EXAM_LABELS[activeTab]}`, 15, 35)

    // Student Info
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(11)
    let y = 58
    doc.text(`Name: ${studentInfo?.name || "N/A"}`, 15, y)
    doc.text(`Class: ${studentInfo?.class || ""}-${studentInfo?.section || ""}`, 120, y)
    y += 8
    doc.text(`Roll No: ${studentInfo?.rollNo || "N/A"}`, 15, y)
    doc.text(`Date: ${format(new Date(), "PP")}`, 120, y)

    // Table
    const tableData = enrichedResults.map(r => [
      r.subject,
      r.marksObtained.toString(),
      r.totalMarks.toString(),
      r.percentage.toFixed(1) + "%",
      r.grade
    ])

    // Append total row
    tableData.push([
      "TOTAL",
      totalObtained.toString(),
      totalMax.toString(),
      overallPercentage.toFixed(1) + "%",
      overallGrade
    ])

    autoTable(doc, {
      startY: y + 12,
      head: [["Subject", "Marks Obtained", "Total Marks", "Percentage", "Grade"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235], fontSize: 10 },
      styles: { fontSize: 10 },
      foot: [[
        { content: `Result: ${isPassed ? "PASS" : "FAIL"}`, colSpan: 5, styles: { fillColor: isPassed ? [220, 252, 231] : [254, 226, 226], textColor: isPassed ? [22, 101, 52] : [153, 27, 27], fontStyle: 'bold', halign: 'center', fontSize: 12 } }
      ]],
    })

    // Footer
    const pageHeight = doc.internal.pageSize.height
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text("This is a computer-generated report card.", 15, pageHeight - 15)
    doc.text(`Generated: ${format(new Date(), "PPpp")}`, 15, pageHeight - 9)

    doc.save(`Report_${EXAM_LABELS[activeTab].replace(/\s/g, "_")}_${studentInfo?.rollNo || "student"}.pdf`)
  }

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-blue-900">My Results</h2>
          <p className="text-muted-foreground mt-1">View exam-wise academic performance and download report cards.</p>
        </div>
        {enrichedResults.length > 0 && (
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={downloadReportCard}>
            <Download className="w-4 h-4 mr-2" />
            Download Report Card
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          {EXAM_TYPES.map(et => (
            <TabsTrigger key={et} value={et}>{EXAM_LABELS[et]}</TabsTrigger>
          ))}
        </TabsList>

        {EXAM_TYPES.map(et => (
          <TabsContent key={et} value={et}>
            <Card className="border-blue-100">
              <CardHeader className="bg-blue-50/50">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-lg">{EXAM_LABELS[et]} — Subject-Wise Breakdown</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                {loading ? (
                  <div className="flex justify-center p-12"><LoadingSpinner /></div>
                ) : enrichedResults.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No results published yet for this exam.
                  </div>
                ) : (
                  <>
                    <Table className="min-w-[600px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead className="text-center">Obtained</TableHead>
                          <TableHead className="text-center">Total</TableHead>
                          <TableHead className="text-center">Percentage</TableHead>
                          <TableHead className="text-center">Grade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {enrichedResults.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">{r.subject}</TableCell>
                            <TableCell className="text-center font-bold">{r.marksObtained}</TableCell>
                            <TableCell className="text-center">{r.totalMarks}</TableCell>
                            <TableCell className="text-center">{r.percentage.toFixed(1)}%</TableCell>
                            <TableCell className="text-center">
                              <Badge className={getGradeColor(r.grade)}>{r.grade}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Total row */}
                        <TableRow className="bg-blue-50 font-bold border-t-2 border-blue-200">
                          <TableCell className="font-bold text-blue-900">TOTAL</TableCell>
                          <TableCell className="text-center font-bold text-blue-900">{totalObtained}</TableCell>
                          <TableCell className="text-center font-bold text-blue-900">{totalMax}</TableCell>
                          <TableCell className="text-center font-bold text-blue-900">{overallPercentage.toFixed(1)}%</TableCell>
                          <TableCell className="text-center">
                            <Badge className={getGradeColor(overallGrade)}>{overallGrade}</Badge>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>

                    {/* Pass / Fail banner */}
                    <div className={`p-4 text-center font-bold text-lg ${isPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {isPassed ? (
                        <span>✅ RESULT: PASS — Overall {overallPercentage.toFixed(1)}%</span>
                      ) : (
                        <span>❌ RESULT: FAIL — Overall {overallPercentage.toFixed(1)}% (Minimum 33% required)</span>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
