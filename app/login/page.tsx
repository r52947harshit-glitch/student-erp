"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"

type Role = "STUDENT" | "TEACHER" | "ADMIN"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<Role>("STUDENT")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg("")

    const res = await signIn("credentials", {
      email,
      password,
      role,
      redirect: false,
    })

    setLoading(false)

    if (res?.error) {
      setErrorMsg(res.error)
    } else {
      if (role === "ADMIN") router.push("/admin/dashboard")
      else if (role === "TEACHER") router.push("/teacher/dashboard")
      else router.push("/student/dashboard")
    }
  }

  const roleConfig = {
    STUDENT: {
      activeBg: "bg-blue-600 text-white hover:bg-blue-700",
      btnBg: "bg-blue-600 hover:bg-blue-700",
    },
    TEACHER: {
      activeBg: "bg-emerald-600 text-white hover:bg-emerald-700",
      btnBg: "bg-emerald-600 hover:bg-emerald-700",
    },
    ADMIN: {
      activeBg: "bg-purple-600 text-white hover:bg-purple-700",
      btnBg: "bg-purple-600 hover:bg-purple-700",
    }
  }

  const activeRole = roleConfig[role]

  return (
    <div className="min-h-screen flex animate-in fade-in duration-500">
      
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col items-center justify-center bg-gradient-to-br from-purple-700 to-blue-600 text-white p-12 w-1/2">
        <div className="text-6xl mb-6">🏫</div>
        <h1 className="text-3xl font-bold text-center mb-3">
          School ERP
        </h1>
        <p className="text-white/80 text-center text-lg">
          Manage your school efficiently
        </p>
        <div className="mt-12 grid grid-cols-3 gap-4 w-full max-w-xs">
          <div className="text-center">
            <div className="text-2xl font-bold">8+</div>
            <div className="text-white/70 text-xs mt-1">Classes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">3</div>
            <div className="text-white/70 text-xs mt-1">Portals</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">100%</div>
            <div className="text-white/70 text-xs mt-1">Secure</div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 bg-white">
        <div className="w-full max-w-sm mx-auto space-y-8">
          
          <div className="text-center">
            <div className="text-4xl mb-4 lg:hidden">🏫</div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Welcome Back</h2>
            <p className="text-slate-500 mt-2">Sign in to continue</p>
          </div>

          {/* Role Selector */}
          <div className="flex p-1 bg-slate-100 rounded-full">
            {(["STUDENT", "TEACHER", "ADMIN"] as Role[]).map((r) => {
              const isActive = role === r
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => { setRole(r); setErrorMsg(""); }}
                  className={cn(
                    "flex-1 py-2 text-sm font-semibold rounded-full transition-all duration-200",
                    isActive 
                      ? roleConfig[r].activeBg + " shadow-sm"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                  )}
                >
                  {r.charAt(0) + r.slice(1).toLowerCase()}
                </button>
              )
            })}
          </div>

          {errorMsg && (
            <Alert variant="destructive" className="bg-red-50 text-red-600 border-red-200 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <AlertDescription className="ml-2 font-medium">{errorMsg}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@school.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className={cn("w-full h-11 text-base text-white transition-all", activeRole.btnBg)}
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Authenticating...</>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500">
            Forgot password? Contact admin.
          </p>
        </div>
      </div>
      
    </div>
  )
}
