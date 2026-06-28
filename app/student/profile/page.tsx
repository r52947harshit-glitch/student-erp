"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { PageHeader } from "@/components/shared/PageHeader"
import { Camera, MapPin, Phone, Mail, User, GraduationCap, CalendarDays, KeyRound } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PasswordChangeForm } from "@/components/shared/PasswordChangeForm"

export default function StudentProfile() {
  const [student, setStudent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const { toast } = useToast()

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

  // Generate color based on name string
  const stringToColor = (str: string) => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    const color = Math.floor(Math.abs(Math.sin(hash) * 16777215)).toString(16)
    return "#" + "000000".substring(0, 6 - color.length) + color
  }

  if (loading) return <div className="py-20"><LoadingSpinner /></div>
  if (!student) return <div className="p-6 text-center text-red-500 bg-red-50 rounded-lg">Failed to load profile. Please contact administrator.</div>

  const avatarColor = stringToColor(student?.user?.name || "S")

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      <PageHeader 
        title="My Profile" 
        description="View your academic details and manage account settings."
      />

      <div className="grid md:grid-cols-3 gap-6">
        
        {/* LEFT CARD - Profile Display */}
        <Card className="col-span-1 border-blue-100 shadow-sm h-fit overflow-hidden">
          <div className="h-24 bg-gradient-to-br from-blue-500 to-indigo-600 w-full" />
          <CardContent className="pt-0 flex flex-col items-center text-center px-6 pb-6">
            <div className="relative -mt-12 mb-6 flex flex-col items-center group">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md bg-white" />
              ) : student.photoUrl ? (
                <img src={student.photoUrl} alt="Profile" className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md bg-white transition-transform duration-300 group-hover:scale-105" />
              ) : (
                <div 
                  className="w-32 h-32 rounded-full flex items-center justify-center text-5xl font-bold text-white border-4 border-white shadow-md transition-transform duration-300 group-hover:scale-105"
                  style={{ backgroundColor: avatarColor }}
                >
                  {(student?.user?.name || "S").charAt(0)}
                </div>
              )}
              
              {!photoFile && (
                <label htmlFor="photo-upload" className="absolute bottom-1 right-1 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors shadow-md ring-4 ring-white">
                  <Camera className="w-4 h-4" />
                  <input id="photo-upload" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileSelect} disabled={uploading} />
                </label>
              )}
            </div>

            {photoFile && (
              <div className="flex flex-col items-center gap-3 mb-6 w-full p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                <span className="text-xs font-medium text-blue-800">
                  Ready to upload: {(photoFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
                <div className="flex gap-2 w-full">
                  <Button size="sm" variant="outline" className="flex-1 bg-white border-blue-200 text-blue-700 hover:bg-blue-50" onClick={cancelPhotoUpload} disabled={uploading}>Cancel</Button>
                  <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handlePhotoUpload} disabled={uploading}>
                    {uploading ? "Uploading..." : "Save Photo"}
                  </Button>
                </div>
              </div>
            )}
            
            {!photoFile && <span className="text-xs text-slate-400 mb-2">JPG, PNG or WebP (max 2MB)</span>}
            
            <h3 className="text-2xl font-bold text-slate-900">{student?.user?.name ?? "—"}</h3>
            <p className="text-sm font-medium text-blue-600 mt-1 uppercase tracking-wider">Student ID: {student.id.substring(0, 8)}</p>
            
            <div className="w-full mt-6 pt-6 border-t border-slate-100 grid gap-4">
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-slate-500 font-medium">Roll Number</p>
                  <p className="text-sm font-bold text-slate-900">{student.rollNo}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-slate-500 font-medium">Class & Section</p>
                  <p className="text-sm font-bold text-slate-900">{student.class} - {student.section}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-4 h-4 text-cyan-600" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-slate-500 font-medium">Date of Birth</p>
                  <p className="text-sm font-bold text-slate-900">{new Date(student.dob).toLocaleDateString('en-IN')}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 text-xs text-slate-500 text-center p-3 bg-amber-50/50 rounded-lg border border-amber-100 w-full">
              Academic details are locked. Contact administration for changes.
            </div>
          </CardContent>
        </Card>

        {/* RIGHT CARD - Tabs for Info and Password */}
        <div className="col-span-1 md:col-span-2">
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 p-1 bg-slate-100">
              <TabsTrigger value="info" className="data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm rounded-md transition-all py-2">Contact Info</TabsTrigger>
              <TabsTrigger value="password" className="data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm rounded-md transition-all py-2 flex items-center gap-2"><KeyRound className="w-4 h-4" /> Security</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-0">
              <Card className="border-blue-100 shadow-sm">
                <CardHeader className="bg-blue-50/30 border-b border-blue-50 pb-4">
                  <CardTitle className="text-blue-900 text-lg">Contact Information</CardTitle>
                  <CardDescription>Your registered contact details for school communications.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2.5 p-4 rounded-xl border border-slate-100 bg-white shadow-sm hover:border-blue-100 transition-colors">
                      <Label className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-blue-500" /> Parent/Guardian
                      </Label>
                      <div className="text-sm font-bold text-slate-800">{student.parentName}</div>
                    </div>
                    
                    <div className="space-y-2.5 p-4 rounded-xl border border-slate-100 bg-white shadow-sm hover:border-blue-100 transition-colors">
                      <Label className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-blue-500" /> Contact Number
                      </Label>
                      <div className="text-sm font-bold text-slate-800">{student.contact}</div>
                    </div>
                    
                    <div className="space-y-2.5 p-4 rounded-xl border border-slate-100 bg-white shadow-sm hover:border-blue-100 transition-colors col-span-1 md:col-span-2">
                      <Label className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-blue-500" /> Email Address
                      </Label>
                      <div className="text-sm font-bold text-slate-800">{student?.user?.email ?? "—"}</div>
                    </div>
                    
                    <div className="space-y-2.5 p-4 rounded-xl border border-slate-100 bg-white shadow-sm hover:border-blue-100 transition-colors col-span-1 md:col-span-2">
                      <Label className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-500" /> Home Address
                      </Label>
                      <div className="text-sm font-medium text-slate-800 leading-relaxed">{student.address}</div>
                    </div>
                  </div>
                  
                  <div className="mt-8 text-sm text-slate-500 p-4 bg-slate-50 border border-slate-100 rounded-lg text-center flex flex-col sm:flex-row items-center justify-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">i</span>
                    <span>Need to update your phone number or address? Please submit a written request to the school administration office.</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="password" className="mt-0">
              <Card className="border-blue-100 shadow-sm">
                <CardHeader className="bg-blue-50/30 border-b border-blue-50 pb-4">
                  <CardTitle className="text-blue-900 text-lg">Change Password</CardTitle>
                  <CardDescription>Update your account password to ensure security.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <PasswordChangeForm apiEndpoint="/api/students/me/password" />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
