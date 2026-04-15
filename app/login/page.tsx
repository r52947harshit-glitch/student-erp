"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, User, GraduationCap, Shield } from "lucide-react"

type Role = "STUDENT" | "TEACHER" | "ADMIN"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
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
      setErrorMsg(res.error) // This will grab the exact thrown error string from NextAuth
    } else {
      // Redirect based on role
      if (role === "ADMIN") router.push("/admin/dashboard")
      else if (role === "TEACHER") router.push("/teacher/dashboard")
      else router.push("/student/dashboard")
    }
  }

  const getHighlightColor = () => {
    if (role === "STUDENT") return "bg-blue-600 hover:bg-blue-700"
    if (role === "TEACHER") return "bg-emerald-600 hover:bg-emerald-700"
    if (role === "ADMIN") return "bg-purple-600 hover:bg-purple-700"
    return ""
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-transparent" 
            style={{ borderTopColor: role === 'STUDENT' ? '#2563eb' : role === 'TEACHER' ? '#059669' : '#9333ea' }}>
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto bg-slate-200 h-16 w-16 rounded-full flex items-center justify-center text-slate-500 font-bold text-xl">
            ERP
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
            <CardDescription>Select your portal and enter your credentials.</CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            
            {errorMsg && (
              <Alert variant="destructive" className="bg-red-50 text-red-600 border-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="ml-2 font-medium">{errorMsg}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-3 gap-2">
              <Button 
                type="button" 
                variant="outline" 
                className={`flex flex-col h-20 gap-2 items-center justify-center ${role === 'STUDENT' ? 'border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800' : ''}`}
                onClick={() => setRole("STUDENT")}
              >
                <GraduationCap className="w-6 h-6" />
                <span className="text-xs">Student</span>
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className={`flex flex-col h-20 gap-2 items-center justify-center ${role === 'TEACHER' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800' : ''}`}
                onClick={() => setRole("TEACHER")}
              >
                <User className="w-6 h-6" />
                <span className="text-xs">Teacher</span>
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className={`flex flex-col h-20 gap-2 items-center justify-center ${role === 'ADMIN' ? 'border-purple-500 bg-purple-50 text-purple-700 hover:bg-purple-100 hover:text-purple-800' : ''}`}
                onClick={() => setRole("ADMIN")}
              >
                <Shield className="w-6 h-6" />
                <span className="text-xs">Admin</span>
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@school.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className={`w-full text-white ${getHighlightColor()}`} disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Authenticating...</> : "Login to Portal"}
            </Button>
            <p className="text-xs text-center text-muted-foreground w-full">
              Accounts are provisioned by administration. Please contact the office if you cannot login.
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
