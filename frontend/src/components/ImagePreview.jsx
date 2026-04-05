import { Download, Clock } from 'lucide-react'
import { useLang } from '../context/LangContext'

export default function ImagePreview({ originalPreview, result }) {
  const { tr } = useLang()

  if (!result) return null

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = result.image_base64
    const ext = result.image_base64.startsWith('data:image/png') ? 'png' : 'jpg'
    a.download = `picedit_result.${ext}`
    a.click()
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800">{tr('result')}</h2>
        {result.process_time_ms && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            {(result.process_time_ms / 1000).toFixed(1)}s
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-400 mb-2 text-center">{tr('original')}</p>
          <div className="bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center min-h-[150px] sm:min-h-[180px]">
            <img src={originalPreview} alt={tr('original')} className="max-h-48 sm:max-h-64 max-w-full object-contain" />
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-2 text-center">{tr('result')}</p>
          <div
            className="rounded-xl overflow-hidden flex items-center justify-center min-h-[150px] sm:min-h-[180px]"
            style={{ background: 'repeating-conic-gradient(#e5e7eb 0% 25%, #fff 0% 50%) 0 0 / 16px 16px' }}
          >
            <img src={result.image_base64} alt={tr('result')} className="max-h-48 sm:max-h-64 max-w-full object-contain" />
          </div>
        </div>
      </div>

      {result.output_size && (
        <p className="text-xs text-gray-400 text-center mb-3">
          {tr('output_size', { w: result.output_size[0], h: result.output_size[1] })}
        </p>
      )}

      <button
        onClick={handleDownload}
        className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-xl transition-colors"
      >
        <Download className="w-4 h-4" />
        {tr('download')}
      </button>
    </div>
  )
}
