import { useEffect } from 'react'
import { AlertCircle, X } from 'lucide-react'

export default function ErrorToast({ message, onClose }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [message, onClose])

  if (!message) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 shadow-lg max-w-sm animate-in fade-in slide-in-from-top-2">
      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <p className="text-red-700 text-sm flex-1">{message}</p>
      <button onClick={onClose} className="text-red-400 hover:text-red-600">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
