import { useState } from 'react'
import { Type } from 'lucide-react'
import { useLang } from '../../context/LangContext'

const POSITIONS = [
  ['top-left', '↖'],    ['top-center', '↑'],    ['top-right', '↗'],
  [null, ''],           ['center', '●'],          [null, ''],
  ['bottom-left', '↙'], ['bottom-center', '↓'],  ['bottom-right', '↘'],
]

export default function WatermarkPanel({ onProcess, isLoading }) {
  const [text, setText] = useState('© PicEdit')
  const [position, setPosition] = useState('bottom-right')
  const [fontSize, setFontSize] = useState(36)
  const [opacity, setOpacity] = useState(0.5)
  const [color, setColor] = useState('#FFFFFF')
  const { tr } = useLang()

  const handleSubmit = () => {
    if (!text.trim()) return
    onProcess({ text: text.trim(), position, fontSize, opacity, color })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-5">
        <Type className="w-5 h-5 text-blue-600" />
        <h2 className="font-semibold text-gray-800">{tr('watermark_title')}</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{tr('watermark_text_label')}</label>
          <input
            type="text" value={text}
            onChange={e => setText(e.target.value)}
            placeholder={tr('watermark_text_placeholder')}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{tr('watermark_position_label')}</label>
          <div className="grid grid-cols-3 gap-1.5 w-36">
            {POSITIONS.map(([pos, symbol], i) =>
              pos === null ? (
                <div key={i} className="aspect-square" />
              ) : (
                <button
                  key={pos}
                  onClick={() => setPosition(pos)}
                  title={pos}
                  className={`aspect-square rounded-lg text-lg flex items-center justify-center transition-all ${
                    position === pos
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {symbol}
                </button>
              )
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {tr('watermark_font_size')}<span className="text-blue-600">{fontSize}px</span>
          </label>
          <input
            type="range" min="12" max="120" value={fontSize}
            onChange={e => setFontSize(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {tr('watermark_opacity')}<span className="text-blue-600">{Math.round(opacity * 100)}%</span>
          </label>
          <input
            type="range" min="0" max="100" value={Math.round(opacity * 100)}
            onChange={e => setOpacity(e.target.value / 100)}
            className="w-full accent-blue-600"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">{tr('watermark_color')}</label>
          <input
            type="color" value={color}
            onChange={e => setColor(e.target.value)}
            className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
          />
          <span className="text-sm text-gray-500 font-mono">{color}</span>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isLoading || !text.trim()}
        className="w-full mt-5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-3 rounded-xl transition-colors"
      >
        {isLoading ? tr('processing') : tr('watermark_btn')}
      </button>
    </div>
  )
}
