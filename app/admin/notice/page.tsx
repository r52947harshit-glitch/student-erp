"use client"

import { useState, useEffect } from "react"
import { useQuill } from "react-quilljs"
import "quill/dist/quill.snow.css"

import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Edit, Trash, Clock, Send } from "lucide-react"

export default function PostNotice() {
  const { toast } = useToast()

  const [notices, setNotices] = useState<any[]>([])
  const [isEditing, setIsEditing] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    targetRole: "ALL",
    scheduledAt: "",
  })

  const [body, setBody] = useState("")
  const [loading, setLoading] = useState(false)

  // ✅ Quill setup
  const { quill, quillRef } = useQuill({
    theme: "snow",
  })

  // Sync editor content
  useEffect(() => {
    if (quill) {
      quill.on("text-change", () => {
        setBody(quill.root.innerHTML)
      })
    }
  }, [quill])

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
    }
  }

  useEffect(() => {
    fetchNotices()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = { ...formData, body }

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
        description: `Failed to ${
          isEditing ? "update" : "post"
        } notice.`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (n: any) => {
    setIsEditing(n.id)

    setFormData({
      title: n.title,
      category: n.category,
      targetRole: n.targetRole,
      scheduledAt: n.scheduledAt
        ? n.scheduledAt.substring(0, 16)
        : "",
    })

    setBody(n.body)

    // Update editor content
    if (quill) {
      quill.root.innerHTML = n.body
    }
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

    setBody("")

    if (quill) {
      quill.root.innerHTML = ""
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">
        Notice Board
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Composer */}
        <Card>
          <CardHeader>
            <CardTitle>
              {isEditing ? "Edit Notice" : "Compose Notice"}
            </CardTitle>
            <CardDescription>
              Draft and publish announcements to the portal.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Notice Title</Label>
                <Input
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      title: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) =>
                      setFormData({ ...formData, category: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Holiday">
                        Holiday
                      </SelectItem>
                      <SelectItem value="Exam">
                        Exam
                      </SelectItem>
                      <SelectItem value="Event">
                        Event
                      </SelectItem>
                      <SelectItem value="General">
                        General
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <Select
                    value={formData.targetRole}
                    onValueChange={(v) =>
                      setFormData({ ...formData, targetRole: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">
                        All Users
                      </SelectItem>
                      <SelectItem value="STUDENT">
                        Students Only
                      </SelectItem>
                      <SelectItem value="TEACHER">
                        Teachers Only
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Schedule Notice</Label>
                <Input
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      scheduledAt: e.target.value,
                    })
                  }
                />
              </div>

              {/* ✅ Editor */}
              <div className="space-y-2">
                <Label>Content Body</Label>
                <div className="h-48">
                  <div ref={quillRef} />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                {isEditing && (
                  <Button
                    variant="outline"
                    type="button"
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                )}

                <Button type="submit" disabled={loading}>
                  <Send className="w-4 h-4 mr-2" />
                  {isEditing ? "Update" : "Publish"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Notices List */}
        <Card>
          <CardHeader>
            <CardTitle>Notices</CardTitle>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>

              <TableBody>
                {notices.map((n) => {
                  const isScheduled =
                    n.scheduledAt &&
                    new Date(n.scheduledAt) > new Date()

                  return (
                    <TableRow key={n.id}>
                      <TableCell>{n.title}</TableCell>

                      <TableCell>{n.targetRole}</TableCell>

                      <TableCell>
                        {isScheduled ? "Scheduled" : "Live"}
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {format(
                            new Date(
                              isScheduled
                                ? n.scheduledAt
                                : n.createdAt
                            ),
                            "PP p"
                          )}
                        </span>
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(n)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(n.id)}
                        >
                          <Trash className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}