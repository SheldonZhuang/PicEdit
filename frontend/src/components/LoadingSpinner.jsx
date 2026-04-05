import { useLang } from '../context/LangContext'

export default function LoadingSpinner({ message }) {
  const { tr } = useLang()
  const text = message || tr('processing')

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl max-w-xs mx-4">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
          <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
        </div>
        <p className="text-gray-700 font-medium text-center">{text}</p>
        <p className="text-gray-400 text-xs text-center">{tr('keep_page_open')}</p>
      </div>
    </div>
  )
}
