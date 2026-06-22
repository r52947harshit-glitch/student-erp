"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MarkAttendanceTab } from "./MarkAttendanceTab"
import { SalarySetupTab } from "./SalarySetupTab"
import { ProcessSalaryTab } from "./ProcessSalaryTab"
import { PaymentHistoryTab } from "./PaymentHistoryTab"
import { PageHeader } from "@/components/shared/PageHeader"

export default function SalaryPage() {
  const [activeTab, setActiveTab] = useState("attendance")

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader 
        title="Teacher Salary Management" 
        description="Manage attendance, setup base salaries, process monthly payroll, and view history."
      />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full md:w-[600px] grid-cols-2 md:grid-cols-4 mb-4 h-auto md:h-10">
          <TabsTrigger value="attendance" className="py-2.5">Mark Attendance</TabsTrigger>
          <TabsTrigger value="setup" className="py-2.5">Salary Setup</TabsTrigger>
          <TabsTrigger value="process" className="py-2.5">Process Salary</TabsTrigger>
          <TabsTrigger value="history" className="py-2.5">Payment History</TabsTrigger>
        </TabsList>
        <TabsContent value="attendance" className="mt-0"><MarkAttendanceTab /></TabsContent>
        <TabsContent value="setup" className="mt-0"><SalarySetupTab /></TabsContent>
        <TabsContent value="process" className="mt-0"><ProcessSalaryTab /></TabsContent>
        <TabsContent value="history" className="mt-0"><PaymentHistoryTab /></TabsContent>
      </Tabs>
    </div>
  )
}
