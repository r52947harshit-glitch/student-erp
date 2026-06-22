"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      <PageHeader 
        title="Notice Board" 
        description="Official announcements and faculty communications from the administration."
        action={
          <div className="w-full sm:w-48">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="bg-white border-slate-200 focus:ring-emerald-500 shadow-sm"><SelectValue placeholder="Filter Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                <SelectItem value="Holiday">Holiday</SelectItem>
                <SelectItem value="Exam">Exam</SelectItem>
                <SelectItem value="Event">Event</SelectItem>
                <SelectItem value="General">General</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="space-y-4">
        {loading ? (
          <div className="py-16 flex justify-center"><LoadingSpinner /></div>
        ) : filteredNotices.length === 0 ? (
          <Card className="border-slate-200 border-dashed shadow-sm">
            <CardContent className="p-0">
              <EmptyState 
                icon={Bell}
                title="No notices available"
                description={filterCategory === "ALL" ? "You're all caught up! There are no announcements at the moment." : `No notices found in the "${filterCategory}" category.`}
              />
            </CardContent>
          </Card>
        ) : (
          filteredNotices.map((n) => {
            const isUnread = !readNotices.has(n.id)

            return (
              <Card 
                key={n.id} 
                onClick={() => markAsRead(n.id)}
                className={`transition-all duration-300 cursor-pointer overflow-hidden group ${isUnread ? 'border-l-4 border-l-emerald-500 shadow-md bg-white border-y-emerald-100 border-r-emerald-100 hover:shadow-lg' : 'border-l-4 border-l-transparent bg-slate-50 opacity-90 hover:opacity-100 border-y-slate-200 border-r-slate-200'}`}
              >
                <CardHeader className="pb-3 pt-5">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        {isUnread ? (
                          <div className="bg-emerald-100 p-1.5 rounded-full">
                            <BellRing className="w-4 h-4 text-emerald-600 animate-pulse" />
                          </div>
                        ) : (
                          <div className="bg-slate-100 p-1.5 rounded-full">
                            <Bell className="w-4 h-4 text-slate-400 group-hover:text-slate-500 transition-colors" />
                          </div>
                        )}
                        <CardTitle className={`text-xl font-bold leading-tight ${isUnread ? 'text-emerald-950' : 'text-slate-700 group-hover:text-slate-900 transition-colors'}`}>{n.title}</CardTitle>
                      </div>
                      <CardDescription className="flex items-center gap-2 text-xs font-medium ml-[34px]">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {format(new Date(n.scheduledAt || n.createdAt), "EEEE, do MMMM yyyy - p")}
                      </CardDescription>
                    </div>
                    <Badge variant={n.category === 'Holiday' ? 'destructive' : n.category === 'Exam' ? 'default' : 'secondary'} className={`${isUnread && n.category === 'General' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : ''} shrink-0`}>
                      {n.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pb-5">
                  <div 
                    className={`prose prose-sm max-w-none line-clamp-3 ml-[34px] ${isUnread ? 'text-slate-700' : 'text-slate-500 group-hover:text-slate-600 transition-colors'}`}
                    dangerouslySetInnerHTML={{ __html: n.body }}
                  />
                  {isUnread && (
                    <div className="ml-[34px] mt-4 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
                        Click anywhere on card to mark as read
                      </p>
                    </div>
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
