import {
  InterTight_400Regular,
  InterTight_500Medium,
  InterTight_600SemiBold,
  useFonts,
} from '@expo-google-fonts/inter-tight'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { SessionProvider, useSession } from '../src/lib/session'
import { I18nProvider, useI18n } from '../src/lib/i18nContext'
import { colors } from '../src/theme'
import type { Lang } from '../src/lib/i18n'

function LangSync() {
  const { user } = useSession()
  const { setLang } = useI18n()
  useEffect(() => {
    const preferred = user?.preferred_language
    if (preferred === 'en' || preferred === 'rw' || preferred === 'fr') {
      setLang(preferred as Lang)
    }
  }, [user?.preferred_language, setLang])
  return null
}

export default function RootLayout() {
  const [loaded] = useFonts({
    InterTight_400Regular,
    InterTight_500Medium,
    InterTight_600SemiBold,
  })

  if (!loaded) return null

  return (
    <I18nProvider>
      <SessionProvider>
        <LangSync />
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.paper },
            animation: 'slide_from_right',
          }}
        />
      </SessionProvider>
    </I18nProvider>
  )
}
