"use client"

import { formatDistanceToNow } from "date-fns"
import { Bell, FileText, CheckCircle, AlertTriangle, IndianRupee, GraduationCap, Megaphone } from "lucide-react"
import Link from "next/link"

interface Notification {
  id: string
  type: string
  title: string
  body: string
  link?: string | null
  isRead: boolean
  createdAt: string
}

export function NotificationItem({ notification, onClick }: { notification: Notification, onClick: () => void }) {
  const getIcon = (type: string) => {
    switch (type) {
      case "ASSIGNMENT_POSTED": return <FileText className="h-5 w-5 text-blue-500" />
      case "FEE_DUE_REMINDER": return <AlertTriangle className="h-5 w-5 text-red-500" />
      case "ATTENDANCE_ABSENT": return <AlertTriangle className="h-5 w-5 text-orange-500" />
      case "RESULT_PUBLISHED": return <CheckCircle className="h-5 w-5 text-green-500" />
      case "SALARY_PROCESSED": return <IndianRupee className="h-5 w-5 text-emerald-600" />
      case "NOTICE_PUBLISHED": return <Megaphone className="h-5 w-5 text-purple-500" />
      case "YEAR_PROMOTED": return <GraduationCap className="h-5 w-5 text-indigo-500" />
      default: return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  const content = (
    <div 
      onClick={onClick}
      className={`flex items-start gap-3 p-3 hover:bg-slate-50 transition-colors border-b last:border-0 ${
        !notification.isRead ? "bg-blue-50/50" : ""
      }`}
    >
      <div className="flex-shrink-0 mt-1">
        {getIcon(notification.type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${!notification.isRead ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>
          {notification.title}
        </p>
        <p className="text-sm text-slate-600 line-clamp-2 mt-0.5">
          {notification.body}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>
      {!notification.isRead && (
        <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-2" />
      )}
    </div>
  )

  if (notification.link) {
    return (
      <Link href={notification.link} className="block">
        {content}
      </Link>
    )
  }

  return <div className="cursor-pointer">{content}</div>
}
