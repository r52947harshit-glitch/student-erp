"use client"

import React from "react"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  icon: React.ElementType
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({
  icon: Icon, title, description, action
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="p-4 bg-muted rounded-full mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  )
}
