import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { t as translate, type Lang } from './i18n'

interface I18nValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children, initialLang = 'en' as Lang }: { children: ReactNode; initialLang?: Lang }) {
  const [lang, setLang] = useState<Lang>(initialLang)
  const value = useMemo<I18nValue>(() => ({ lang, setLang, t: (key) => translate(lang, key) }), [lang])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
