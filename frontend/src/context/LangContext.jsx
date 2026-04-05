import { createContext, useContext, useState } from 'react'
import { translations } from '../i18n'

const LangContext = createContext(null)

export function LangProvider({ children }) {
  const [lang, setLang] = useState('zh')

  const tr = (key, vars = {}) => {
    let text = translations[lang]?.[key] ?? translations.en?.[key] ?? key
    Object.entries(vars).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, v)
    })
    return text
  }

  return (
    <LangContext.Provider value={{ lang, setLang, tr }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLang = () => useContext(LangContext)
