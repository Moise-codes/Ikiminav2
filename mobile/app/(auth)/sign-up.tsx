import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native'
import { Link, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ApiError, api } from '../../src/lib/api'
import { useI18n } from '../../src/lib/i18nContext'
import { Body, Button, Field, H1, Input, Screen, Segmented } from '../../src/components/ui'
import { colors, font, radius, spacing } from '../../src/theme'
import type { Lang } from '../../src/lib/i18n'

export default function SignUp() {
  const { t, lang, setLang } = useI18n()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [prefLang, setPrefLang] = useState<Lang>(lang)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setBusy(true)
    try {
      await api.register({
        full_name: fullName.trim(),
        phone: phone.trim(),
        password,
        preferred_language: prefLang,
      })
      router.replace({ pathname: '/(auth)/verify', params: { phone: phone.trim() } })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <Screen style={{ paddingTop: spacing.xxl, paddingBottom: spacing.xxl, gap: spacing.xl }}>
            <View style={{ gap: spacing.sm }}>
              <H1>{t('auth.signUpTitle')}</H1>
              <Body>{t('auth.signUpSubtitle')}</Body>
            </View>

            <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.lg }}>
              <Field label={t('auth.fullName')}>
                <Input value={fullName} onChangeText={setFullName} placeholder="Uwimana Jean" autoComplete="name" />
              </Field>
              <Field label={t('auth.phone')} hint={t('auth.phoneHint')}>
                <Input value={phone} onChangeText={setPhone} placeholder="0788 123 456" keyboardType="phone-pad" autoComplete="tel" />
              </Field>
              <Field label={t('auth.password')}>
                <Input value={password} onChangeText={setPassword} secureTextEntry autoComplete="password-new" />
              </Field>
              <View style={{ gap: spacing.sm }}>
                <Text style={{ fontFamily: font.medium, fontSize: 12.5, color: colors.ink }}>{t('auth.language')}</Text>
                <Segmented
                  options={[{ value: 'rw', label: 'KIN' }, { value: 'fr', label: 'FR' }, { value: 'en', label: 'EN' }]}
                  value={prefLang}
                  onChange={(v) => {
                    const next = v as Lang
                    setPrefLang(next)
                    setLang(next)
                  }}
                />
              </View>

              {error ? (
                <View style={{ backgroundColor: colors.debitWash, borderRadius: radius.sm, padding: 12 }}>
                  <Text style={{ fontFamily: font.regular, fontSize: 12.5, color: colors.debit }}>{error}</Text>
                </View>
              ) : null}

              <Button title={t('auth.register')} onPress={submit} loading={busy} />
              <View style={{ flexDirection: 'row', gap: spacing.xs, justifyContent: 'center' }}>
                <Text style={{ fontFamily: font.regular, fontSize: 12.5, color: colors.muted }}>{t('auth.haveAccount')}</Text>
                <Link href="/(auth)/sign-in" style={{ fontFamily: font.medium, fontSize: 12.5, color: colors.ink }}>
                  {t('auth.signIn')}
                </Link>
              </View>
            </View>
          </Screen>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
