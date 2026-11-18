import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { api, ApiError } from '../../src/lib/api'
import { useSession } from '../../src/lib/session'
import { useI18n } from '../../src/lib/i18nContext'
import { phonePretty } from '../../src/lib/format'
import { Body, Button, Card, Divider, Field, H1, Input, Label, Screen, Segmented } from '../../src/components/ui'
import { colors, font, radius, spacing } from '../../src/theme'
import type { Lang } from '../../src/lib/i18n'

export default function Settings() {
  const { user, signOut, reload } = useSession()
  const { t, lang, setLang } = useI18n()
  const [name, setName] = useState(user?.full_name ?? '')
  const [language, setLanguage] = useState<Lang>((user?.preferred_language as Lang) ?? lang)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      setName(user.full_name)
      if (user.preferred_language === 'en' || user.preferred_language === 'rw' || user.preferred_language === 'fr') {
        setLanguage(user.preferred_language as Lang)
      }
    }
  }, [user])

  async function save() {
    setMessage(null)
    setSaving(true)
    try {
      await api.updateMe({ full_name: name.trim(), preferred_language: language })
      setLang(language)
      await reload()
      setMessage(t('settings.saved'))
    } catch (caught) {
      setMessage(caught instanceof ApiError ? caught.message : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <Screen style={{ paddingTop: spacing.lg, gap: spacing.xl }}>
          <Pressable onPress={() => router.back()} style={{ alignSelf: 'flex-start', paddingVertical: 4 }}>
            <Text style={{ fontFamily: font.medium, fontSize: 13, color: colors.muted }}>← {t('common.back')}</Text>
          </Pressable>

          <H1>{t('settings.title')}</H1>

          <Card style={{ gap: spacing.md }}>
            <Label>{t('settings.phone')}</Label>
            <Text style={{ fontFamily: font.semibold, fontSize: 16, color: colors.ink }}>
              {phonePretty(user?.phone ?? null)}
            </Text>
            <Divider />
            <Text style={{ fontFamily: font.regular, fontSize: 11.5, color: colors.muted, lineHeight: 17 }}>
              {t('settings.phoneNote')}
            </Text>
          </Card>

          <Card style={{ gap: spacing.lg }}>
            <Field label={t('settings.fullName')}>
              <Input value={name} onChangeText={setName} autoComplete="name" />
            </Field>

            <View style={{ gap: spacing.sm }}>
              <Label>{t('settings.language')}</Label>
              <Segmented
                options={[{ value: 'rw', label: 'KIN' }, { value: 'fr', label: 'FR' }, { value: 'en', label: 'EN' }]}
                value={language}
                onChange={(v) => setLanguage(v as Lang)}
              />
            </View>

            {message ? (
              <Text style={{ fontFamily: font.regular, fontSize: 12, color: colors.accent }}>{message}</Text>
            ) : null}

            <Button title={t('settings.save')} onPress={save} loading={saving} />
          </Card>

          <Card style={{ gap: spacing.md }}>
            <Label>{t('settings.session')}</Label>
            <Body>{t('settings.sessionNote')}</Body>
            <Button
              title={t('settings.signOut')}
              variant="outline"
              onPress={async () => {
                await signOut()
                router.replace('/(auth)/sign-in')
              }}
            />
          </Card>
        </Screen>
      </ScrollView>
    </SafeAreaView>
  )
}
