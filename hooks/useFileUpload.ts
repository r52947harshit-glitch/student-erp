"use client"

import { useState } from "react"

export function useFileUpload() {
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = async (
    url: string,
    formData: FormData
  ): Promise<{ success: boolean; data?: any }> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100)
          setProgress(percent)
        }
      })

      xhr.addEventListener('load', () => {
        setUploading(false)
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ success: true, data: JSON.parse(xhr.responseText) })
        } else {
          const err = JSON.parse(xhr.responseText)
          setError(err.error || 'Upload failed')
          resolve({ success: false })
        }
      })

      xhr.addEventListener('error', () => {
        setUploading(false)
        setError('Network error during upload')
        reject(new Error('Network error'))
      })

      xhr.open('POST', url)
      setUploading(true)
      setProgress(0)
      setError(null)
      xhr.send(formData)
    })
  }

  return { upload, progress, uploading, error, setProgress }
}
