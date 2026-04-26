"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { Camera, Eye, EyeOff } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function StudentProfile() {
  const [student, setStudent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const { toast } = useToast()

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/students/me")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStudent(data)
    } catch (e: any) {
      toast({ title: "Error", description: "Failed to load profile", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Error", description: "Image must be under 2MB", variant: "destructive" })
      return
    }

    setPhotoFile(file)
    const objectUrl = URL.createObjectURL(file)
    setPhotoPreview(objectUrl)
  }

  const cancelPhotoUpload = () => {
    setPhotoFile(null)
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview)
      setPhotoPreview(null)
    }
  }

  const handlePhotoUpload = async () => {
    if (!photoFile) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("photo", photoFile)
      
      const res = await fetch("/api/students/me/photo", {
        method: "POST",
        body: formData
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      setStudent((prev: any) => ({ ...prev, photoUrl: data.photoUrl }))
      toast({ title: "Success", description: "Profile photo updated" })
      
      cancelPhotoUpload()
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" })
      return
    }

    setChangingPassword(true)
    try {
      const res = await fetch("/api/students/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordForm)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast({ title: "Success", description: "Password changed successfully" })
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setChangingPassword(false)
    }
  }

  // Password Strength Calculation
  const getPasswordStrength = () => {
    const { newPassword } = passwordForm
    const length = newPassword.length >= 8
    const upper = /[A-Z]/.test(newPassword)
    const number = /[0-9]/.test(newPassword)
    const special = /[^A-Za-z0-9]/.test(newPassword)

    const criteriaMet = [length, upper, number, special].filter(Boolean).length

    if (newPassword.length === 0) return { label: "None", color: "bg-slate-200", checks: { length, upper, number, special } }
    if (criteriaMet <= 1) return { label: "Weak", color: "bg-red-500", checks: { length, upper, number, special } }
    if (criteriaMet <= 3) return { label: "Medium", color: "bg-orange-500", checks: { length, upper, number, special } }
    return { label: "Strong", color: "bg-green-500", checks: { length, upper, number, special } }
  }

  const strength = getPasswordStrength()

  // Generate color based on name string
  const stringToColor = (str: string) => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    const color = Math.floor(Math.abs(Math.sin(hash) * 16777215)).toString(16)
    return "#" + "000000".substring(0, 6 - color.length) + color
  }

  if (loading) return <LoadingSpinner />
  if (!student) return <div>Failed to load profile.</div>

  const avatarColor = stringToColor(student.user.name)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">My Profile</h2>

      <div className="grid md:grid-cols-3 gap-6">
        
        {/* LEFT CARD - Profile Display */}
        <Card className="col-span-1 h-fit">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <div className="relative mb-4 flex flex-col items-center">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-32 h-32 rounded-full object-cover border-4 border-blue-100" />
              ) : student.photoUrl ? (
                <img src={student.photoUrl} alt="Profile" className="w-32 h-32 rounded-full object-cover border-4 border-slate-100" />
              ) : (
                <div 
                  className="w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold text-white border-4 border-slate-100"
                  style={{ backgroundColor: avatarColor }}
                >
                  {student.user.name.charAt(0)}
                </div>
              )}
              
              {!photoFile && (
                <label htmlFor="photo-upload" className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-2 rounded-full cursor-pointer hover:bg-primary/90 transition-colors shadow-sm">
                  <Camera className="w-4 h-4" />
                  <input id="photo-upload" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileSelect} disabled={uploading} />
                </label>
              )}
            </div>

            {photoFile && (
              <div className="flex flex-col items-center gap-2 mb-4 w-full">
                <span className="text-xs font-medium text-slate-500">
                  Selected: {(photoFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
                <div className="flex gap-2 w-full">
                  <Button size="sm" variant="outline" className="flex-1" onClick={cancelPhotoUpload} disabled={uploading}>Cancel</Button>
                  <Button size="sm" className="flex-1" onClick={handlePhotoUpload} disabled={uploading}>
                    {uploading ? "Uploading..." : "Confirm Upload"}
                  </Button>
                </div>
              </div>
            )}
            
            {!photoFile && <span className="text-xs text-muted-foreground mb-4">JPG, PNG or WebP, max 2MB</span>}
            
            <h3 className="text-xl font-bold">{student.user.name}</h3>
            
            <div className="w-full space-y-2 text-sm text-left border-t pt-4 mt-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Roll No:</span>
                <span className="font-medium ml-2">{student.rollNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Class:</span>
                <span className="font-medium ml-2">{student.class} - {student.section}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">DOB:</span>
                <span className="font-medium ml-2">{new Date(student.dob).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="mt-6 text-xs text-muted-foreground text-left p-3 bg-slate-50 rounded-md border">
              These details are managed by your school admin.
            </div>
          </CardContent>
        </Card>

        {/* RIGHT CARD - Tabs for Info and Password */}
        <div className="col-span-1 md:col-span-2">
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">My Info</TabsTrigger>
              <TabsTrigger value="password">Change Password</TabsTrigger>
            </TabsList>

            <TabsContent value="info">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Parent Name</Label>
                      <div className="p-2 bg-slate-50 rounded-md border text-sm font-medium">{student.parentName}</div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Contact Number</Label>
                      <div className="p-2 bg-slate-50 rounded-md border text-sm font-medium">{student.contact}</div>
                    </div>
                    <div className="space-y-2 col-span-1 md:col-span-2">
                      <Label className="text-muted-foreground">Email Address</Label>
                      <div className="p-2 bg-slate-50 rounded-md border text-sm font-medium">{student.user.email}</div>
                    </div>
                    <div className="space-y-2 col-span-1 md:col-span-2">
                      <Label className="text-muted-foreground">Home Address</Label>
                      <div className="p-2 bg-slate-50 rounded-md border text-sm font-medium">{student.address}</div>
                    </div>
                  </div>
                  
                  <div className="pt-4 text-sm text-muted-foreground border-t mt-4">
                    To update your personal information, please contact the school admin.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="password">
              <Card>
                <CardHeader>
                  <CardTitle>🔒 Change Password</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Current Password</Label>
                    <div className="relative">
                      <Input 
                        type={showPasswords.current ? "text" : "password"} 
                        value={passwordForm.currentPassword} 
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        className="pr-10"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <div className="relative">
                      <Input 
                        type={showPasswords.new ? "text" : "password"} 
                        value={passwordForm.newPassword} 
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        className="pr-10"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    
                    {passwordForm.newPassword && (
                      <div className="space-y-2 mt-2 p-3 bg-slate-50 rounded-md border text-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-xs">Password strength:</span>
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${strength.color} transition-all`} 
                              style={{ 
                                width: strength.label === "Weak" ? "33%" : strength.label === "Medium" ? "66%" : strength.label === "Strong" ? "100%" : "0%" 
                              }}
                            />
                          </div>
                          <span className={`text-xs font-semibold ${strength.label === "Weak" ? "text-red-500" : strength.label === "Medium" ? "text-orange-500" : "text-green-500"}`}>
                            {strength.label}
                          </span>
                        </div>
                        <ul className="space-y-1 text-muted-foreground text-xs">
                          <li className={strength.checks.length ? "text-green-600 font-medium" : ""}>
                            {strength.checks.length ? "✓" : "✗"} At least 8 characters
                          </li>
                          <li className={strength.checks.upper ? "text-green-600 font-medium" : ""}>
                            {strength.checks.upper ? "✓" : "✗"} One uppercase letter
                          </li>
                          <li className={strength.checks.number ? "text-green-600 font-medium" : ""}>
                            {strength.checks.number ? "✓" : "✗"} One number
                          </li>
                          <li className={strength.checks.special ? "text-green-600 font-medium" : ""}>
                            {strength.checks.special ? "✓" : "✗"} One special character
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Confirm New Password</Label>
                    <div className="relative">
                      <Input 
                        type={showPasswords.confirm ? "text" : "password"} 
                        value={passwordForm.confirmPassword} 
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        className="pr-10"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                      <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
                    )}
                  </div>

                  <Button 
                    className="w-full mt-4" 
                    onClick={handlePasswordChange} 
                    disabled={changingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword}
                  >
                    {changingPassword ? "Changing..." : "Change Password"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
