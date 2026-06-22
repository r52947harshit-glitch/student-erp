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
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { Download, FileSpreadsheet, FileText, CheckCircle2, AlertCircle } from "lucide-react"

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
    case "A+": return "bg-emerald-100 text-emerald-800 border-emerald-200"
    case "A": return "bg-green-100 text-green-800 border-green-200"
    case "B": return "bg-blue-100 text-blue-800 border-blue-200"
    case "C": return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case "D": return "bg-orange-100 text-orange-800 border-orange-200"
    case "F": return "bg-rose-100 text-rose-800 border-rose-200"
    default: return "bg-slate-100 text-slate-800 border-slate-200"
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
    <div className="space-y-6 animate-in fade-in duration-300 max-w-5xl mx-auto">
      <PageHeader 
        title="My Results" 
        description="View your exam-wise academic performance and download official report cards."
        action={
          enrichedResults.length > 0 && (
            <Button className="bg-blue-600 hover:bg-blue-700 shadow-md" onClick={downloadReportCard}>
              <Download className="w-4 h-4 mr-2" /> Download Report Card
            </Button>
          )
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 p-1 bg-blue-50 text-blue-800 border border-blue-100 rounded-lg">
          {EXAM_TYPES.map(et => (
            <TabsTrigger key={et} value={et} className="data-[state=active]:bg-white data-[state=active]:text-blue-900 data-[state=active]:shadow-sm rounded-md transition-all font-semibold">
              {EXAM_LABELS[et]}
            </TabsTrigger>
          ))}
        </TabsList>

        {EXAM_TYPES.map(et => (
          <TabsContent key={et} value={et} className="mt-0">
            <Card className="border-blue-100 shadow-sm overflow-hidden">
              <CardHeader className="bg-blue-50/50 border-b border-blue-50 py-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <CardTitle className="text-lg text-blue-950">{EXAM_LABELS[et]} — Breakdown</CardTitle>
                  </div>
                  
                  {enrichedResults.length > 0 && (
                    <div className="flex items-center gap-2 text-xs font-bold bg-white px-3 py-1.5 rounded-full border border-blue-100 shadow-sm text-blue-800 uppercase tracking-wider">
                      Overall: {overallPercentage.toFixed(1)}% <span className="text-slate-300">|</span> {overallGrade}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex justify-center p-16"><LoadingSpinner /></div>
                ) : enrichedResults.length === 0 ? (
                  <div className="py-16">
                    <EmptyState 
                      icon={FileText}
                      title="No Results Found"
                      description={`Your results for the ${EXAM_LABELS[et]} have not been published yet.`}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <div className="overflow-x-auto">
                      <Table className="min-w-[600px]">
                        <TableHeader className="bg-slate-50/80">
                          <TableRow className="border-b border-slate-200">
                            <TableHead className="font-semibold text-slate-700 w-[200px] pl-6">Subject</TableHead>
                            <TableHead className="text-center font-semibold text-slate-700">Obtained</TableHead>
                            <TableHead className="text-center font-semibold text-slate-700">Total Marks</TableHead>
                            <TableHead className="text-center font-semibold text-slate-700">Percentage</TableHead>
                            <TableHead className="text-center font-semibold text-slate-700 pr-6">Grade</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-slate-100">
                          {enrichedResults.map((r) => (
                            <TableRow key={r.id} className="hover:bg-slate-50/60 transition-colors">
                              <TableCell className="font-semibold text-slate-900 pl-6">{r.subject}</TableCell>
                              <TableCell className="text-center font-bold text-blue-700">{r.marksObtained}</TableCell>
                              <TableCell className="text-center text-slate-600">{r.totalMarks}</TableCell>
                              <TableCell className="text-center font-medium text-slate-700">{r.percentage.toFixed(1)}%</TableCell>
                              <TableCell className="text-center pr-6">
                                <span className={`inline-flex px-2.5 py-1 rounded text-xs font-bold border ${getGradeColor(r.grade)}`}>
                                  {r.grade}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="bg-slate-50 border-t border-slate-200 p-6">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-6 max-w-3xl mx-auto">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 w-full">
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Marks</span>
                            <span className="text-xl font-bold text-slate-900">{totalMax}</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Obtained</span>
                            <span className="text-xl font-black text-blue-700">{totalObtained}</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Percentage</span>
                            <span className="text-xl font-bold text-slate-900">{overallPercentage.toFixed(1)}%</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Grade</span>
                            <span className={`inline-flex px-3 py-0.5 rounded-full text-sm font-bold border ${getGradeColor(overallGrade)}`}>{overallGrade}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Pass / Fail banner */}
                    <div className={`p-4 sm:p-5 flex items-center justify-center gap-3 border-t font-bold text-base sm:text-lg tracking-wide shadow-inner ${isPassed ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-rose-50 text-rose-800 border-rose-100'}`}>
                      {isPassed ? (
                        <>
                          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                          RESULT: PASSED
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-6 h-6 text-rose-600" />
                          RESULT: FAILED <span className="text-sm font-medium ml-2 opacity-80">(Minimum 33% required)</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
