import { Scissors, ZoomIn, Minimize2, Type } from 'lucide-react'

const TABS = [
  { id: 'removebg', label: '抠图', icon: Scissors, desc: 'AI 背景去除' },
  { id: 'upscale',  label: '高清化', icon: ZoomIn,    desc: '放大增强' },
  { id: 'resize',   label: '缩图',   icon: Minimize2, desc: '调整尺寸' },
  { id: 'watermark',label: '水印',   icon: Type,      desc: '添加文字' },
]

export default function FeatureTabs({ activeTab, onChange }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {TABS.map(({ id, label, icon: Icon, desc }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
            ${activeTab === id
              ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
              : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
            }
          `}
        >
          <Icon className="w-4 h-4" />
          <span>{label}</span>
          <span className={`text-xs ${activeTab === id ? 'text-blue-200' : 'text-gray-400'}`}>{desc}</span>
        </button>
      ))}
    </div>
  )
}
