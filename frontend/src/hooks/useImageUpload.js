import { useState, useCallback } from 'react'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_MB = 10

export function useImageUpload() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  const accept = useCallback((newFile) => {
    setUploadError(null)
    if (!ALLOWED_TYPES.includes(newFile.type)) {
      setUploadError('仅支持 PNG / JPEG / WEBP 格式')
      return
    }
    if (newFile.size > MAX_MB * 1024 * 1024) {
      setUploadError(`文件不能超过 ${MAX_MB}MB`)
      return
    }
    if (preview) URL.revokeObjectURL(preview)
    setFile(newFile)
    setPreview(URL.createObjectURL(newFile))
  }, [preview])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) accept(f)
  }, [accept])

  const handleChange = useCallback((e) => {
    const f = e.target.files[0]
    if (f) accept(f)
  }, [accept])

  const reset = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview)
    setFile(null)
    setPreview(null)
    setUploadError(null)
  }, [preview])

  return {
    file, preview, dragOver, uploadError,
    setDragOver,
    handleDrop, handleChange, reset,
  }
}
