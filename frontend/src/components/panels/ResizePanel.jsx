import { useState } from 'react'
import { Minimize2 } from 'lucide-react'
import { useLang } from '../../context/LangContext'

export default function ResizePanel({ onProcess, isLoading }) {
  const [mode, setMode] = useState('ratio')
  const [ratio, setRatio] = useState(50)
  const [width, setWidth] = useState(800)
  const [height, setHeight] = useState(600)
  const [keepAspect, setKeepAspect] = useState(true)
  const { tr } = useLang()

  const handleSubmit = () => {
    if (mode === 'ratio') {
      onProcess({ mode: 'ratio', ratio: ratio / 100 })
    } else {
      onProcess({ mode: 'fixed', width, height, keepAspect })
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-5">
        <Minimize2 className="w-5 h-5 text-blue-600" />
        <h2 className="font-semibold text-gray-800">{tr('resize_title')}</h2>
      </div>

      <div className="flex gap-2 mb-5">
        {[['ratio', tr('resize_mode_ratio')], ['fixed', tr('resize_mode_fixed')]].map(([v, label]) => (
          <button
            key={v}
            onClick={() => setMode(v)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
              mode === v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-blue-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'ratio' ? (
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {tr('resize_ratio_label')}<span className="text-blue-600">{ratio}%</span>
          </label>
          <input
            type="range" min="10" max="200" value={ratio}
            onChange={e => setRatio(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>10%</span><span>100%</span><span>200%</span>
          </div>
        </div>
      ) : (
        <div className="mb-5 space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">{tr('resize_width')}</label>
              <input
                type="number" min="1" value={width}
                onChange={e => setWidth(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">{tr('resize_height')}</label>
              <input
                type="number" min="1" value={height}
                onChange={e => setHeight(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={keepAspect} onChange={e => setKeepAspect(e.target.checked)} className="accent-blue-600" />
            <span className="text-sm text-gray-600">{tr('resize_keep_aspect')}</span>
          </label>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-3 rounded-xl transition-colors"
      >
        {isLoading ? tr('processing') : tr('resize_btn')}
      </button>
    </div>
  )
}
