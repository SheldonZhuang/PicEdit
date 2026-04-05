import { Scissors, ZoomIn, Minimize2, Type } from 'lucide-react'
import { useLang } from '../context/LangContext'

export default function FeatureTabs({ activeTab, onChange }) {
  const { tr } = useLang()

  const TABS = [
    { id: 'removebg',  label: tr('tab_removebg_label'),  icon: Scissors,  desc: tr('tab_removebg_desc') },
    { id: 'upscale',   label: tr('tab_upscale_label'),   icon: ZoomIn,    desc: tr('tab_upscale_desc') },
    { id: 'resize',    label: tr('tab_resize_label'),    icon: Minimize2, desc: tr('tab_resize_desc') },
    { id: 'watermark', label: tr('tab_watermark_label'), icon: Type,      desc: tr('tab_watermark_desc') },
  ]

  return (
    <div className="flex gap-2 flex-wrap">
      {TABS.map(({ id, label, icon: Icon, desc }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`
            flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-medium transition-all
            ${activeTab === id
              ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
              : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
            }
          `}
        >
          <Icon className="w-4 h-4" />
          <span>{label}</span>
          <span className={`text-xs hidden sm:inline ${activeTab === id ? 'text-blue-200' : 'text-gray-400'}`}>{desc}</span>
        </button>
      ))}
    </div>
  )
}
