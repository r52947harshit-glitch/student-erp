"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { Bell, BellRing, CalendarDays } from "lucide-react"

export default function TeacherNotices() {
  const { toast } = useToast()
  
  const [notices, setNotices] = useState<any[]>([])
  const [filterCategory, setFilterCategory] = useState("ALL")
  const [loading, setLoading] = useState(true)
  const [readNotices, setReadNotices] = useState<Set<string>>(new Set())

  // Load read status from local storage
  useEffect(() => {
    const stored = localStorage.getItem("erp_teacher_read_notices")
    if (stored) {
      setReadNotices(new Set(JSON.parse(stored)))
    }
  }, [])

  useEffect(() => {
    fetch("/api/notices")
      .then(res => res.json())
      .then(data => {
        // Filter by role = ALL or TEACHER. Also ensure it's not a future scheduled notice
        const now = new Date()
        const targetNotices = data.filter((n: any) => 
          (n.targetRole === "ALL" || n.targetRole === "TEACHER") &&
          (!n.scheduledAt || new Date(n.scheduledAt) <= now)
        )
        setNotices(targetNotices)
      })
      .catch(() => toast({ title: "Error", description: "Failed to pull notices", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [toast])

  const markAsRead = (id: string) => {
    if (readNotices.has(id)) return
    
    const newSet = new Set(readNotices)
    newSet.add(id)
    setReadNotices(newSet)
    localStorage.setItem("erp_teacher_read_notices", JSON.stringify(Array.from(newSet)))
  }

  const filteredNotices = notices.filter(n => {
    if (filterCategory === "ALL") return true
    return n.category === filterCategory
  })

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-emerald-900">Notice Board</h2>
          <p className="text-muted-foreground mt-1">Official announcements and faculty communications.</p>
        </div>
        <div className="w-full md:w-48">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger><SelectValue placeholder="Filter Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              <SelectItem value="Holiday">Holiday</SelectItem>
              <SelectItem value="Exam">Exam</SelectItem>
              <SelectItem value="Event">Event</SelectItem>
              <SelectItem value="General">General</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredNotices.length === 0 ? (
          <div className="text-center p-12 border border-dashed rounded-lg text-muted-foreground">
            No notices available.
          </div>
        ) : (
          filteredNotices.map((n) => {
            const isUnread = !readNotices.has(n.id)

            return (
              <Card 
                key={n.id} 
                onClick={() => markAsRead(n.id)}
                className={`transition-all duration-200 cursor-pointer border-l-4 ${isUnread ? 'border-l-emerald-500 shadow-md bg-white' : 'border-l-transparent bg-slate-50/50 opacity-80'}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {isUnread ? <BellRing className="w-4 h-4 text-emerald-500 animate-pulse" /> : <Bell className="w-4 h-4 text-slate-400" />}
                        <CardTitle className={`text-xl ${isUnread ? 'text-emerald-900' : 'text-slate-700'}`}>{n.title}</CardTitle>
                      </div>
                      <CardDescription className="flex items-center gap-2 text-xs font-medium">
                        <CalendarDays className="w-3 h-3" />
                        {format(new Date(n.scheduledAt || n.createdAt), "EEEE, do MMMM yyyy - p")}
                      </CardDescription>
                    </div>
                    <Badge variant={n.category === 'Holiday' ? 'destructive' : n.category === 'Exam' ? 'default' : 'secondary'} className={isUnread && n.category === 'General' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : ''}>
                      {n.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div 
                    className="prose prose-sm prose-emerald max-w-none line-clamp-3 text-slate-600"
                    dangerouslySetInnerHTML={{ __html: n.body }}
                  />
                  {isUnread && (
                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mt-4">
                      Click to mark read
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
