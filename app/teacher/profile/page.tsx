"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { QUALIFICATION_LIST } from "@/lib/constants"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { Camera, Edit, Save, X } from "lucide-react"

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
        // Do NOT set Content-Type header! Let browser set it.
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

  if (loading) return <LoadingSpinner />
  if (!teacher) return <div>Failed to load profile.</div>

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">My Profile</h2>

      <div className="grid md:grid-cols-3 gap-6">
        
        {/* LEFT CARD - Profile Display */}
        <Card className="col-span-1">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <div className="relative mb-4 flex flex-col items-center">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-32 h-32 rounded-full object-cover border-4 border-blue-100" />
              ) : teacher.photoUrl ? (
                <img src={teacher.photoUrl} alt="Profile" className="w-32 h-32 rounded-full object-cover border-4 border-slate-100" />
              ) : (
                <div className="w-32 h-32 rounded-full bg-slate-200 flex items-center justify-center text-4xl font-bold text-slate-500 border-4 border-slate-100">
                  {teacher.user.name.charAt(0)}
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
                    {uploading ? "Uploading..." : "Upload Photo"}
                  </Button>
                </div>
              </div>
            )}
            
            {!photoFile && <span className="text-xs text-muted-foreground mb-4">JPG, PNG or WebP, max 2MB</span>}
            
            <h3 className="text-xl font-bold">{teacher.user.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">{teacher.employeeId}</p>
            
            <div className="w-full space-y-2 text-sm text-left border-t pt-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium truncate ml-2">{teacher.user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Joined:</span>
                <span className="font-medium">{new Date(teacher.joiningDate).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RIGHT CARD - Editable Info & Classes */}
        <div className="col-span-1 md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Personal Information</CardTitle>
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
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
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  {isEditing ? (
                    <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} pattern="^[6-9]\d{9}$" />
                  ) : (
                    <div className="p-2 bg-slate-50 rounded-md border text-sm">{teacher.phone}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Qualification</Label>
                  {isEditing ? (
                    <Select value={formData.qualification} onValueChange={v => setFormData({...formData, qualification: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {QUALIFICATION_LIST.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-2 bg-slate-50 rounded-md border text-sm">{teacher.qualification}</div>
                  )}
                </div>
                <div className="col-span-1 md:col-span-2 space-y-2">
                  <Label>Address</Label>
                  {isEditing ? (
                    <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                  ) : (
                    <div className="p-2 bg-slate-50 rounded-md border text-sm">{teacher.address}</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>📚 Your Assigned Classes</CardTitle>
            </CardHeader>
            <CardContent>
              {teacher.assignedClasses.length === 0 ? (
                <p className="text-muted-foreground text-sm">No classes assigned yet.</p>
              ) : (
                <div className="space-y-3">
                  {teacher.assignedClasses.map((ac: any) => (
                    <div key={ac.id} className="p-3 bg-slate-50 border rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="font-semibold whitespace-nowrap">Class {ac.className}</div>
                      <div className="text-sm text-muted-foreground">{ac.subjects.join(", ")}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
