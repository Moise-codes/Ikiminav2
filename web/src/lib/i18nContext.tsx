import { createContext, useContext, useState, type ReactNode } from 'react'
import { t, type Lang } from './i18n'

interface I18nContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('itsinda-lang') as Lang | null
    return stored && ['en', 'rw', 'fr'].includes(stored) ? stored : 'en'
  })

  function changeLang(l: Lang) {
    setLang(l)
    localStorage.setItem('itsinda-lang', l)
  }

  return (
    <I18nContext.Provider value={{ lang, setLang: changeLang, t: (key) => t(lang, key) }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
