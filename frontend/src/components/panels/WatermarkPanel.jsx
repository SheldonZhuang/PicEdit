import { useState } from 'react'
import { Type } from 'lucide-react'

// 9 宫格布局，null 表示占位（不可点击）
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

  const handleSubmit = () => {
    if (!text.trim()) return
    onProcess({ text: text.trim(), position, fontSize, opacity, color })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-5">
        <Type className="w-5 h-5 text-blue-600" />
        <h2 className="font-semibold text-gray-800">添加水印</h2>
      </div>

      <div className="space-y-4">
        {/* 文字内容 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">水印文字</label>
          <input
            type="text" value={text}
            onChange={e => setText(e.target.value)}
            placeholder="请输入水印内容"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>

        {/* 位置 3x3 网格 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">水印位置</label>
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

        {/* 字体大小 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            字体大小：<span className="text-blue-600">{fontSize}px</span>
          </label>
          <input
            type="range" min="12" max="120" value={fontSize}
            onChange={e => setFontSize(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>

        {/* 透明度 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            透明度：<span className="text-blue-600">{Math.round(opacity * 100)}%</span>
          </label>
          <input
            type="range" min="0" max="100" value={Math.round(opacity * 100)}
            onChange={e => setOpacity(e.target.value / 100)}
            className="w-full accent-blue-600"
          />
        </div>

        {/* 颜色 */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">颜色</label>
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
        {isLoading ? '处理中...' : '添加水印'}
      </button>
    </div>
  )
}
