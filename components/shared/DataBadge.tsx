import { cn } from "@/lib/utils"

export type BadgeStatus =
  | "PAID" | "PENDING" | "FAILED" | "PROCESSING"
  | "PRESENT" | "ABSENT" | "HALF_DAY"
  | "PAID_LEAVE" | "UNPAID_LEAVE"
  | "SUBMITTED" | "COMPLETED"
  | "ACTIVE" | "INACTIVE"

const badgeConfig: Record<BadgeStatus, {
  label: string
  className: string
}> = {
  PAID:         { label: "Paid",          className: "bg-green-100 text-green-700" },
  PENDING:      { label: "Pending",       className: "bg-yellow-100 text-yellow-700" },
  FAILED:       { label: "Failed",        className: "bg-red-100 text-red-700" },
  PROCESSING:   { label: "Processing",    className: "bg-blue-100 text-blue-700" },
  PRESENT:      { label: "Present",       className: "bg-green-100 text-green-700" },
  ABSENT:       { label: "Absent",        className: "bg-red-100 text-red-700" },
  HALF_DAY:     { label: "Half Day",      className: "bg-orange-100 text-orange-700" },
  PAID_LEAVE:   { label: "Paid Leave",    className: "bg-blue-100 text-blue-700" },
  UNPAID_LEAVE: { label: "Unpaid Leave",  className: "bg-slate-100 text-slate-700" },
  SUBMITTED:    { label: "Submitted",     className: "bg-blue-100 text-blue-700" },
  COMPLETED:    { label: "Completed",     className: "bg-green-100 text-green-700" },
  ACTIVE:       { label: "Active",        className: "bg-green-100 text-green-700" },
  INACTIVE:     { label: "Inactive",      className: "bg-slate-100 text-slate-700" },
}

export function DataBadge({ status }: { status: BadgeStatus }) {
  const config = badgeConfig[status] || { label: status, className: "bg-slate-100 text-slate-700" }
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full",
      "text-xs font-medium",
      config.className
    )}>
      {config.label}
    </span>
  )
}
