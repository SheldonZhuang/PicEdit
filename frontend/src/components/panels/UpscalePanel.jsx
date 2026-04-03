import { useState } from 'react'
import { ZoomIn } from 'lucide-react'

export default function UpscalePanel({ onProcess, isLoading }) {
  const [scale, setScale] = useState(2)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-5">
        <ZoomIn className="w-5 h-5 text-blue-600" />
        <h2 className="font-semibold text-gray-800">高清放大</h2>
      </div>

      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">放大倍数</label>
        <div className="flex gap-3">
          {[2, 4].map(n => (
            <button
              key={n}
              onClick={() => setScale(n)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                scale === n
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:border-blue-300'
              }`}
            >
              {n}x
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">使用 Lanczos 插值，处理速度快</p>
      </div>

      <button
        onClick={() => onProcess({ scale })}
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-3 rounded-xl transition-colors"
      >
        {isLoading ? '处理中...' : '开始高清化'}
      </button>
    </div>
  )
}
