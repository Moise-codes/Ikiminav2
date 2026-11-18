import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ApiError, api } from '../../src/lib/api'
import { useSession } from '../../src/lib/session'
import { useI18n } from '../../src/lib/i18nContext'
import { Body, Button, Field, H1, Input, Screen } from '../../src/components/ui'
import { colors, font, radius, spacing } from '../../src/theme'

export default function Verify() {
  const { verify } = useSession()
  const { t } = useI18n()
  const params = useLocalSearchParams<{ phone?: string }>()
  const [phone, setPhone] = useState(typeof params.phone === 'string' ? params.phone : '')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    setError(null)
    setBusy(true)
    try {
      await verify(phone.trim(), code.trim())
      router.replace('/(app)/home')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not confirm the code.')
    } finally {
      setBusy(false)
    }
  }

  async function resend() {
    setError(null)
    try {
      await api.resendOtp(phone.trim())
      setCode('')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not resend the code.')
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <Screen style={{ paddingTop: spacing.xxl, paddingBottom: spacing.xxl, gap: spacing.xl }}>
            <View style={{ gap: spacing.sm }}>
              <H1>{t('auth.verifyTitle')}</H1>
              <Body>{t('auth.verifySubtitle')}</Body>
            </View>

            <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.lg }}>
              <Field label={t('auth.phone')}>
                <Input value={phone} onChangeText={setPhone} placeholder="0788 123 456" keyboardType="phone-pad" />
              </Field>
              <Field label={t('auth.code')}>
                <Input
                  value={code}
                  onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={{ letterSpacing: 10, textAlign: 'center', fontFamily: font.semibold, fontSize: 20 }}
                />
              </Field>

              {error ? (
                <View style={{ backgroundColor: colors.debitWash, borderRadius: radius.sm, padding: 12 }}>
                  <Text style={{ fontFamily: font.regular, fontSize: 12.5, color: colors.debit }}>{error}</Text>
                </View>
              ) : null}

              <Button title={t('auth.verifyContinue')} onPress={submit} loading={busy} disabled={code.length !== 6} />
              <Button title={t('auth.resend')} onPress={resend} variant="quiet" />
            </View>
          </Screen>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
