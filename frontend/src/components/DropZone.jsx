import { useRef } from 'react'
import { Upload, ImageIcon, X } from 'lucide-react'

export default function DropZone({ file, preview, dragOver, uploadError, setDragOver, handleDrop, handleChange, reset }) {
  const inputRef = useRef(null)

  return (
    <div className="w-full">
      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => inputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer
            transition-all duration-200 min-h-[220px]
            ${dragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50'
            }
          `}
        >
          <Upload className="w-10 h-10 text-gray-400 mb-4" />
          <p className="text-gray-600 font-medium text-lg">点击或拖拽图片到此处</p>
          <p className="text-gray-400 text-sm mt-1">支持 PNG / JPEG / WEBP，最大 10MB</p>
          {uploadError && (
            <p className="text-red-500 text-sm mt-3 bg-red-50 px-3 py-1.5 rounded-lg">{uploadError}</p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleChange}
          />
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center min-h-[220px]">
          <img
            src={preview}
            alt="已上传图片"
            className="max-h-64 max-w-full object-contain"
          />
          <button
            onClick={(e) => { e.stopPropagation(); reset() }}
            className="absolute top-3 right-3 bg-white/80 hover:bg-white rounded-full p-1.5 shadow transition-colors"
            title="重新上传"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
          <div className="absolute bottom-3 left-3 bg-white/80 rounded-lg px-2 py-1 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs text-gray-600 truncate max-w-[200px]">{file.name}</span>
          </div>
        </div>
      )}
    </div>
  )
}
