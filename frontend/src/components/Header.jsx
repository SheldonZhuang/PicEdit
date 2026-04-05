import { useState, useRef, useEffect } from 'react'
import { ImageIcon, Globe, ChevronDown } from 'lucide-react'
import { useLang } from '../context/LangContext'
import { langs } from '../i18n'

export default function Header() {
  const { lang, setLang, tr } = useLang()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl">
            <ImageIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-none">{tr('app_title')}</h1>
            <p className="text-xs text-gray-500 mt-0.5">{tr('app_subtitle')}</p>
          </div>
        </div>

        {/* 语言切换 */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">{langs[lang]}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
              {Object.entries(langs).map(([code, name]) => (
                <button
                  key={code}
                  onClick={() => { setLang(code); setOpen(false) }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    lang === code
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
