"use client"

import { useState, useEffect, useRef } from "react"
import { Bell, Check, Loader2 } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { NotificationItem } from "./NotificationItem"

interface Notification {
  id: string
  type: string
  title: string
  body: string
  link?: string | null
  isRead: boolean
  createdAt: string
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const lastFetchRef = useRef<number>(0)

  // Fetch notifications
  const fetchNotifications = async (force = false) => {
    const now = Date.now()
    if (!force && now - lastFetchRef.current < 30000) {
      return
    }
    lastFetchRef.current = now
    try {
      const res = await fetch("/api/notifications?limit=20")
      if (res.ok) {
        const { data } = await res.json()
        if (data) {
          setNotifications(data.notifications)
          setUnreadCount(data.unreadCount)
        }
      }
    } catch (e) {
      console.error("Failed to fetch notifications", e)
    }
  }

  // Poll every 30 seconds
  useEffect(() => {
    fetchNotifications(true)
    const interval = setInterval(() => fetchNotifications(false), 30000)
    return () => clearInterval(interval)
  }, [])

  const markAsRead = async (id?: string) => {
    try {
      const payload = id ? { notificationIds: [id] } : { markAllRead: true }
      await fetch("/api/notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      
      // Optimistic update
      if (id) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))
      } else {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error("Failed to mark read", error)
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      const now = Date.now()
      if (now - lastFetchRef.current >= 30000) {
        setLoading(true)
        fetchNotifications(true).finally(() => setLoading(false))
      }
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 hover:bg-slate-100 rounded-full">
          <Bell className="h-5 w-5 text-slate-600" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 sm:w-96">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50/50">
          <h3 className="font-semibold text-slate-800">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => markAsRead()}
              className="h-8 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <Check className="h-3 w-3 mr-1" /> Mark all read
            </Button>
          )}
        </div>
        
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <Bell className="h-6 w-6 text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-600">No notifications</p>
              <p className="text-xs text-slate-400 mt-1">You're all caught up!</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notification) => (
                <NotificationItem 
                  key={notification.id} 
                  notification={notification} 
                  onClick={() => !notification.isRead && markAsRead(notification.id)}
                />
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
