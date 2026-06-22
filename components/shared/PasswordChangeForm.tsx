"use client"

import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Lock, CheckCircle2 } from "lucide-react"

export function PasswordChangeForm({ apiEndpoint }: { apiEndpoint: string }) {
  const { toast } = useToast()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPasswords, setShowPasswords] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Password strength calculation
  const calculateStrength = (pass: string) => {
    let score = 0
    if (pass.length > 7) score += 1
    if (/[A-Z]/.test(pass)) score += 1
    if (/[0-9]/.test(pass)) score += 1
    if (/[^A-Za-z0-9]/.test(pass)) score += 1
    return score
  }

  const strength = calculateStrength(newPassword)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "New passwords do not match", variant: "destructive" })
      return
    }

    if (strength < 3) {
      toast({ title: "Error", description: "Password is too weak. Please use a stronger password.", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(apiEndpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to update password")
      }

      toast({ title: "Success", description: "Password updated successfully" })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Current Password</Label>
          <div className="relative">
            <Input
              type={showPasswords ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="pl-10 pr-10"
              required
            />
            <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>New Password</Label>
          <div className="relative">
            <Input
              type={showPasswords ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pl-10 pr-10"
              required
              minLength={8}
            />
            <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <button
              type="button"
              onClick={() => setShowPasswords(!showPasswords)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          
          {newPassword.length > 0 && (
            <div className="space-y-1 mt-2">
              <div className="flex gap-1 h-1.5">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-full ${
                      i < strength
                        ? strength === 1 ? 'bg-red-500'
                        : strength === 2 ? 'bg-orange-500'
                        : strength === 3 ? 'bg-blue-500'
                        : 'bg-green-500'
                        : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-500 flex justify-between">
                <span>
                  {strength === 0 ? "Very Weak" : strength === 1 ? "Weak" : strength === 2 ? "Fair" : strength === 3 ? "Good" : "Strong"}
                </span>
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Confirm New Password</Label>
          <div className="relative">
            <Input
              type={showPasswords ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10"
              required
              minLength={8}
            />
            <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            {confirmPassword && confirmPassword === newPassword && (
              <CheckCircle2 className="w-4 h-4 absolute right-3 top-3 text-green-500" />
            )}
          </div>
        </div>
      </div>

      <Button type="submit" disabled={submitting || !currentPassword || !newPassword || newPassword !== confirmPassword || strength < 3}>
        {submitting ? "Updating..." : "Update Password"}
      </Button>
    </form>
  )
}
