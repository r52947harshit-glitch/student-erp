"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MarkAttendanceTab } from "./MarkAttendanceTab"
import { SalarySetupTab } from "./SalarySetupTab"
import { ProcessSalaryTab } from "./ProcessSalaryTab"
import { PaymentHistoryTab } from "./PaymentHistoryTab"

export default function SalaryPage() {
  const [activeTab, setActiveTab] = useState("attendance")

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Teacher Salary Management</h2>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="attendance">Mark Attendance</TabsTrigger>
          <TabsTrigger value="setup">Salary Setup</TabsTrigger>
          <TabsTrigger value="process">Process Salary</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
        </TabsList>
        <TabsContent value="attendance"><MarkAttendanceTab /></TabsContent>
        <TabsContent value="setup"><SalarySetupTab /></TabsContent>
        <TabsContent value="process"><ProcessSalaryTab /></TabsContent>
        <TabsContent value="history"><PaymentHistoryTab /></TabsContent>
      </Tabs>
    </div>
  )
}
