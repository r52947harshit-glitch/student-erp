"use client"

import React from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ElementType
  description?: string
  trend?: "up" | "down" | "neutral"
  color?: "blue" | "green" | "orange" | "red" | "purple"
  href?: string
}

export function StatCard({
  title, value, icon: Icon,
  description, color = "blue", href
}: StatCardProps) {
  const colorMap = {
    blue:   "bg-blue-50 text-blue-600 dark:bg-blue-950",
    green:  "bg-green-50 text-green-600 dark:bg-green-950",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-950",
    red:    "bg-red-50 text-red-600 dark:bg-red-950",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-950",
  }

  const card = (
    <Card className={cn(
      "transition-all duration-200 border border-slate-200",
      href && "cursor-pointer hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5"
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              {title}
            </p>
            <p className="text-3xl font-bold">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          <div className={cn(
            "p-3 rounded-xl shrink-0",
            colorMap[color]
          )}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (href) return <Link href={href}>{card}</Link>
  return card
}
