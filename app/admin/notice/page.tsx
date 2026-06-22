"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

import { Trash, Send, Loader2, Pencil, CalendarClock, Bell, Clock } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { cn } from "@/lib/utils"

export default function PostNotice() {
  const { toast } = useToast()

  const [notices, setNotices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    targetRole: "ALL",
    scheduledAt: "",
  })

  const [body, setBody] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isScheduled, setIsScheduled] = useState(false)

  const fetchNotices = async () => {
    try {
      const res = await fetch("/api/notices")
      setNotices(await res.json())
    } catch {
      toast({
        title: "Error",
        description: "Failed to load notices",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotices()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const payload = { 
        ...formData, 
        body,
        scheduledAt: isScheduled ? formData.scheduledAt : ""
      }

      const endpoint = isEditing
        ? `/api/notices/${isEditing}`
        : "/api/notices"

      const method = isEditing ? "PUT" : "POST"

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error()

      toast({
        title: "Success",
        description: `Notice ${isEditing ? "updated" : "posted"}.`,
      })

      handleCancel()
      fetchNotices()
    } catch {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "post"} notice.`,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (n: any) => {
    setIsEditing(n.id)

    const isSched = !!n.scheduledAt && new Date(n.scheduledAt) > new Date()
    setIsScheduled(isSched)

    setFormData({
      title: n.title,
      category: n.category,
      targetRole: n.targetRole,
      scheduledAt: n.scheduledAt ? n.scheduledAt.substring(0, 16) : "",
    })

    setBody(n.body)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this notice?")) return

    try {
      const res = await fetch(`/api/notices/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error()

      toast({ title: "Success", description: "Notice deleted." })
      fetchNotices()
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete notice",
        variant: "destructive",
      })
    }
  }

  const handleCancel = () => {
    setIsEditing(null)

    setFormData({
      title: "",
      category: "",
      targetRole: "ALL",
      scheduledAt: "",
    })
    setIsScheduled(false)

    setBody("")
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader 
        title="Notice Board" 
        description="Draft, schedule, and manage announcements for students and teachers."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Composer */}
        <Card className="sticky top-6">
          <CardHeader>
            <CardTitle>
              {isEditing ? "Edit Notice" : "Compose Notice"}
            </CardTitle>
            <CardDescription>
              {isEditing ? "Update your existing announcement." : "Create a new announcement to broadcast."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Notice Title</Label>
                <Input 
                  id="title" 
                  required
                  placeholder="e.g., Annual Sports Day 2026" 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>

              {/* Two column row: Category + Target Audience */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData({ ...formData, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Holiday">Holiday</SelectItem>
                      <SelectItem value="Exam">Exam</SelectItem>
                      <SelectItem value="Event">Event</SelectItem>
                      <SelectItem value="General">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <Select
                    value={formData.targetRole}
                    onValueChange={(v) => setFormData({ ...formData, targetRole: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Users</SelectItem>
                      <SelectItem value="STUDENT">Students Only</SelectItem>
                      <SelectItem value="TEACHER">Teachers Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Body */}
              <div className="space-y-2">
                <Label htmlFor="body">Message</Label>
                <Textarea
                  id="body"
                  required
                  rows={6}
                  placeholder="Write the details of your announcement here..."
                  className="resize-none"
                  value={body}
                  onChange={(e) => setBody(e.target.value.substring(0, 1000))}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {body.length}/1000 characters
                </p>
              </div>

              {/* Schedule toggle */}
              <div className={cn(
                "flex flex-wrap items-center gap-3 p-4 rounded-lg border transition-colors",
                isScheduled ? "bg-primary/5 border-primary/20" : "bg-muted/50"
              )}>
                <Switch 
                  id="schedule" 
                  checked={isScheduled} 
                  onCheckedChange={setIsScheduled} 
                />
                <Label htmlFor="schedule" className="cursor-pointer flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                  Schedule for later
                </Label>
                {isScheduled && (
                  <Input
                    type="datetime-local"
                    required
                    className="ml-auto w-auto"
                    min={new Date().toISOString().slice(0, 16)}
                    value={formData.scheduledAt}
                    onChange={(e) => setFormData({...formData, scheduledAt: e.target.value})}
                  />
                )}
              </div>

              {/* Button */}
              <div className="flex justify-end pt-2 gap-2 flex-col sm:flex-row">
                {isEditing && (
                  <Button variant="outline" type="button" onClick={handleCancel} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto min-w-[140px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEditing ? "Updating..." : "Posting..."}
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      {isEditing ? "Update Notice" : "Post Notice"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Notices List */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold tracking-tight">Posted Notices</h3>
          
          {loading ? (
            <div className="py-12"><LoadingSpinner /></div>
          ) : notices.length === 0 ? (
            <Card>
              <CardContent className="p-0">
                <EmptyState 
                  icon={Bell}
                  title="No notices found"
                  description="You haven't posted any notices yet. Create your first announcement using the composer."
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {notices.map((n) => {
                const isSched = n.scheduledAt && new Date(n.scheduledAt) > new Date()
                return (
                  <Card key={n.id} className="overflow-hidden transition-colors hover:bg-muted/50">
                    <CardContent className="p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-3 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={n.category === 'Holiday' ? 'destructive' : n.category === 'Exam' ? 'default' : 'secondary'}>
                              {n.category}
                            </Badge>
                            <Badge variant="outline" className="bg-background">
                              Target: {n.targetRole === 'ALL' ? 'Everyone' : n.targetRole === 'STUDENT' ? 'Students' : 'Teachers'}
                            </Badge>
                            {isSched && (
                              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 gap-1">
                                <Clock className="h-3 w-3" /> Scheduled
                              </Badge>
                            )}
                          </div>
                          
                          <div>
                            <h4 className="font-bold text-lg line-clamp-1">{n.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {n.body}
                            </p>
                          </div>
                          
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {isSched ? 'Scheduled for: ' : 'Posted: '}
                            {format(new Date(isSched ? n.scheduledAt : n.createdAt), "PPp")}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 sm:flex-col sm:justify-start self-end sm:self-auto pt-2 sm:pt-0">
                          <Button variant="outline" size="icon" onClick={() => handleEdit(n)} className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => handleDelete(n.id)} className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50">
                            <Trash className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}