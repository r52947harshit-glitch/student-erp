"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { QUALIFICATION_LIST } from "@/lib/constants"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { PageHeader } from "@/components/shared/PageHeader"
import { Camera, Edit, Save, X, BookOpen, ShieldCheck, Mail, Calendar, MapPin, Phone, Award } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PasswordChangeForm } from "@/components/shared/PasswordChangeForm"

export default function TeacherProfile() {
  const [teacher, setTeacher] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    phone: "",
    address: "",
    qualification: ""
  })

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/teachers/me")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTeacher(data)
      setFormData({
        phone: data.phone,
        address: data.address,
        qualification: data.qualification
      })
    } catch (e: any) {
      toast({ title: "Error", description: "Failed to load profile", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/teachers/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTeacher(data)
      setIsEditing(false)
      toast({ title: "Success", description: "Profile updated successfully" })
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

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
      
      const res = await fetch("/api/teachers/me/photo", {
        method: "POST",
        body: formData
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      setTeacher((prev: any) => ({ ...prev, photoUrl: data.photoUrl }))
      toast({ title: "Success", description: "Profile photo updated" })
      
      // Cleanup
      cancelPhotoUpload()
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  if (loading) return <div className="py-12"><LoadingSpinner /></div>
  if (!teacher) return <div className="p-6 text-center text-red-500 bg-red-50 rounded-lg">Failed to load profile. Please contact administrator.</div>

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      <PageHeader 
        title="My Profile" 
        description="View and update your personal information and account settings."
      />

      <div className="grid md:grid-cols-3 gap-6">
        
        {/* LEFT CARD - Profile Display */}
        <Card className="col-span-1 border-emerald-100 shadow-sm h-fit">
          <CardContent className="pt-8 flex flex-col items-center text-center">
            <div className="relative mb-6 flex flex-col items-center group">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-36 h-36 rounded-full object-cover border-4 border-emerald-100 shadow-sm" />
              ) : teacher.photoUrl ? (
                <img src={teacher.photoUrl} alt="Profile" className="w-36 h-36 rounded-full object-cover border-4 border-emerald-100 shadow-sm transition-transform duration-300 group-hover:scale-105" />
              ) : (
                <div className="w-36 h-36 rounded-full bg-emerald-50 flex items-center justify-center text-5xl font-bold text-emerald-600 border-4 border-emerald-100 shadow-sm transition-transform duration-300 group-hover:scale-105">
                  {(teacher?.user?.name || "T").charAt(0)}
                </div>
              )}
              
              {!photoFile && (
                <label htmlFor="photo-upload" className="absolute bottom-2 right-2 bg-emerald-600 text-white p-2.5 rounded-full cursor-pointer hover:bg-emerald-700 transition-colors shadow-md ring-4 ring-white">
                  <Camera className="w-4 h-4" />
                  <input id="photo-upload" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileSelect} disabled={uploading} />
                </label>
              )}
            </div>

            {photoFile && (
              <div className="flex flex-col items-center gap-3 mb-6 w-full px-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                <span className="text-xs font-medium text-emerald-700">
                  Ready to upload: {(photoFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
                <div className="flex gap-2 w-full">
                  <Button size="sm" variant="outline" className="flex-1 bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={cancelPhotoUpload} disabled={uploading}>Cancel</Button>
                  <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handlePhotoUpload} disabled={uploading}>
                    {uploading ? "Uploading..." : "Save Photo"}
                  </Button>
                </div>
              </div>
            )}
            
            {!photoFile && <span className="text-xs text-muted-foreground mb-4">JPG, PNG or WebP (max 2MB)</span>}
            
            <h3 className="text-2xl font-bold text-slate-900">{teacher?.user?.name ?? "—"}</h3>
            <div className="mt-1 flex items-center gap-1.5 justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <p className="text-sm font-medium text-emerald-700">{teacher.employeeId}</p>
            </div>
            
            <div className="w-full space-y-3 text-sm text-left border-t border-slate-100 mt-6 pt-6">
              <div className="flex items-center gap-3 text-slate-600">
                <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">{teacher?.user?.email ?? "—"}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Joined {new Date(teacher.joiningDate).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RIGHT CARD - Editable Info & Classes */}
        <div className="col-span-1 md:col-span-2">
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="info">My Information</TabsTrigger>
              <TabsTrigger value="password">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-6">
              <Card className="border-emerald-100 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-emerald-50 bg-emerald-50/30">
                  <div>
                    <CardTitle className="text-emerald-900">Personal Details</CardTitle>
                    <CardDescription>Update your contact info and qualifications.</CardDescription>
                  </div>
                  {!isEditing ? (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                      <Edit className="w-4 h-4 mr-2" /> Edit Profile
                    </Button>
                  ) : (
                    <div className="space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => {
                        setIsEditing(false);
                        setFormData({ phone: teacher.phone, address: teacher.address, qualification: teacher.qualification });
                      }}>
                        <X className="w-4 h-4 mr-2" /> Cancel
                      </Button>
                      <Button size="sm" onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                        <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-slate-600">
                        <Phone className="w-4 h-4 text-emerald-600" /> Phone Number
                      </Label>
                      {isEditing ? (
                        <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} pattern="^[6-9]\d{9}$" className="border-emerald-200 focus-visible:ring-emerald-500" />
                      ) : (
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-slate-900 font-medium">{teacher.phone}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-slate-600">
                        <Award className="w-4 h-4 text-emerald-600" /> Qualification
                      </Label>
                      {isEditing ? (
                        <Select value={formData.qualification} onValueChange={v => setFormData({...formData, qualification: v})}>
                          <SelectTrigger className="border-emerald-200 focus-visible:ring-emerald-500"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {QUALIFICATION_LIST.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-slate-900 font-medium">{teacher.qualification}</div>
                      )}
                    </div>
                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <Label className="flex items-center gap-2 text-slate-600">
                        <MapPin className="w-4 h-4 text-emerald-600" /> Residential Address
                      </Label>
                      {isEditing ? (
                        <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="border-emerald-200 focus-visible:ring-emerald-500" />
                      ) : (
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-slate-900 font-medium">{teacher.address}</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-emerald-100 shadow-sm">
                <CardHeader className="bg-emerald-50/30 border-b border-emerald-50">
                  <CardTitle className="text-emerald-900 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-emerald-600" /> Your Assigned Classes
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {(teacher?.assignedClasses ?? []).length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground bg-slate-50 rounded-lg border border-dashed">
                      <p>No classes assigned yet.</p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {(teacher?.assignedClasses ?? []).map((ac: any) => (
                        <div key={ac.id} className="p-4 bg-white border border-emerald-100 rounded-lg shadow-sm">
                          <div className="font-bold text-lg text-emerald-900 mb-2">Class {ac.className}</div>
                          <div className="flex flex-wrap gap-1.5">
                            {ac.subjects.map((sub: string) => (
                              <span key={sub} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                                {sub}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="password">
              <Card className="border-emerald-100 shadow-sm">
                <CardHeader className="bg-emerald-50/30 border-b border-emerald-50">
                  <CardTitle className="text-emerald-900">Change Password</CardTitle>
                  <CardDescription>Update your account password to stay secure.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <PasswordChangeForm apiEndpoint="/api/teachers/me/password" />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
