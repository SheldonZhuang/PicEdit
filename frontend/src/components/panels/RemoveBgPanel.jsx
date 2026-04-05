import { Scissors, Cpu } from 'lucide-react'
import { useLang } from '../../context/LangContext'

export default function RemoveBgPanel({ onProcess, isLoading }) {
  const { tr } = useLang()

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Scissors className="w-5 h-5 text-blue-600" />
        <h2 className="font-semibold text-gray-800">{tr('removebg_title')}</h2>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 flex gap-2">
        <Cpu className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-amber-700 text-sm">{tr('removebg_hint')}</p>
      </div>

      <button
        onClick={onProcess}
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-3 rounded-xl transition-colors"
      >
        {isLoading ? tr('removebg_loading') : tr('removebg_btn')}
      </button>
    </div>
  )
}
