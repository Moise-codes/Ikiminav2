import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native'
import { Link, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ApiError } from '../../src/lib/api'
import { useSession } from '../../src/lib/session'
import { useI18n } from '../../src/lib/i18nContext'
import { Body, Button, Field, H1, Input, Label, Screen, Segmented } from '../../src/components/ui'
import { colors, font, radius, spacing } from '../../src/theme'
import type { Lang } from '../../src/lib/i18n'

export default function SignIn() {
  const { signIn } = useSession()
  const { t, lang, setLang } = useI18n()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    setError(null)
    setBusy(true)
    try {
      await signIn(phone.trim(), password)
      router.replace('/(app)/home')
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
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <View style={{ width: 28, height: 28, backgroundColor: colors.ink, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.accent }} />
                  </View>
                  <Text style={{ fontFamily: font.semibold, fontSize: 18, letterSpacing: -0.5, color: colors.ink }}>
                    {t('app.name')}
                  </Text>
                </View>
                <Segmented
                  options={[{ value: 'rw', label: 'KIN' }, { value: 'fr', label: 'FR' }, { value: 'en', label: 'EN' }]}
                  value={lang}
                  onChange={(v) => setLang(v as Lang)}
                />
              </View>
              <Label>{t('auth.tagline')}</Label>
            </View>

            <View style={{ gap: spacing.sm }}>
              <H1>{t('auth.signInTitle')}</H1>
              <Body>{t('auth.signInSubtitle')}</Body>
            </View>

            <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.lg, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 }}>
              <Field label={t('auth.phone')} hint={t('auth.phoneHint')}>
                <Input
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="0788 123 456"
                  keyboardType="phone-pad"
                  autoComplete="tel"
                />
              </Field>
              <Field label={t('auth.password')}>
                <Input value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
              </Field>

              {error ? (
                <View style={{ backgroundColor: colors.debitWash, borderRadius: radius.sm, padding: 12, borderWidth: 1, borderColor: '#f0caca' }}>
                  <Text style={{ fontFamily: font.regular, fontSize: 12.5, color: colors.debit }}>{error}</Text>
                </View>
              ) : null}

              <Button title={t('auth.signIn')} onPress={submit} loading={busy} />

              <View style={{ flexDirection: 'row', gap: spacing.xs, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Text style={{ fontFamily: font.regular, fontSize: 12.5, color: colors.muted }}>{t('auth.joining')}</Text>
                <Link href="/(auth)/verify" style={{ fontFamily: font.medium, fontSize: 12.5, color: colors.accent }}>
                  {t('auth.verifyLink')}
                </Link>
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.xs, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Text style={{ fontFamily: font.regular, fontSize: 12.5, color: colors.muted }}>{t('auth.noAccount')}</Text>
                <Link href="/(auth)/sign-up" style={{ fontFamily: font.medium, fontSize: 12.5, color: colors.ink }}>
                  {t('auth.createAccount')}
                </Link>
              </View>
            </View>
          </Screen>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
