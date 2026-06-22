export const formatDate = (date: Date | string) => {
  if (!date) return ""
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  })
}

export const formatDateTime = (date: Date | string) => {
  if (!date) return ""
  return new Date(date).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  })
}

export const formatCurrency = (amount: number) => {
  if (amount === null || amount === undefined) return ""
  return `₹${amount.toLocaleString("en-IN")}`
}

export function getInitials(name: string) {
  if (!name) return ""
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function getAvatarColor(name: string) {
  if (!name) return "bg-slate-500"
  const colors = [
    "bg-red-500", "bg-orange-500", "bg-amber-500",
    "bg-green-500", "bg-teal-500", "bg-blue-500",
    "bg-indigo-500", "bg-purple-500", "bg-pink-500",
  ]
  const index = name.charCodeAt(0) % colors.length
  return colors[index]
}
