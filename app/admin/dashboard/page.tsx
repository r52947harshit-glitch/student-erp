"use client"

import logger from "@/lib/logger"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, IndianRupee, Clock, CheckCircle, GraduationCap, Banknote, AlertCircle } from "lucide-react"
import { 
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, 
  PieChart, Pie, Cell, Legend
} from "recharts"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { formatCurrency } from "@/lib/formatters"

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then(res => res.json())
      .then(data => {
        setData(data)
        setLoading(false)
      })
      .catch(err => {
        logger.error("Failed to fetch dashboard data", err)
        setLoading(false)
      })
  }, [])

  if (loading) return <LoadingSpinner />
  if (!data || data.error) return <div className="p-4 text-red-500 animate-in fade-in duration-300">Failed to load dashboard data.</div>

  const { metrics, charts } = data
  const COLORS = ['#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e']

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader 
        title="Dashboard Overview" 
        description="Here's what's happening at your school today."
      />

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <StatCard 
          title="Total Students" 
          value={metrics.totalStudents} 
          icon={Users} 
          color="blue"
          href="/admin/students"
        />
        <StatCard 
          title="Total Teachers" 
          value={metrics.totalTeachers || 0} 
          icon={GraduationCap} 
          color="green"
          href="/admin/teachers"
        />
        <StatCard 
          title="Fee Collected (Month)" 
          value={formatCurrency(metrics.feeCollected)} 
          icon={IndianRupee} 
          color="purple"
          href="/admin/fee"
        />
        <StatCard 
          title="Salary Due" 
          value={metrics.salaryDueCount || 0} 
          icon={AlertCircle} 
          color={metrics.salaryDueCount > 0 ? "red" : "green"}
          description="Teachers pending this month"
          href="/admin/salary"
        />
        
        {/* Additional useful stats */}
        <StatCard 
          title="Pending Fees" 
          value={metrics.pendingFeeCount} 
          icon={Clock} 
          color="orange"
          description="Students with pending fees"
          href="/admin/fee"
        />
        <StatCard 
          title="Attendance Today" 
          value={metrics.attendanceSummary} 
          icon={CheckCircle} 
          color="blue"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Monthly Fee Collection</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Fee collection trends over the past few months</p>
          </CardHeader>
          <CardContent className="h-[300px]">
            {charts.feeCollection?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.feeCollection}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                  <RechartsTooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="total" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Distributions by Class</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Student distribution across different classes</p>
          </CardHeader>
          <CardContent className="h-[300px]">
            {charts.classDistribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.classDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {charts.classDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
