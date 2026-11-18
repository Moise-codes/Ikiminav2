import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Field, FormError, FormNote, Input, Segmented } from '@/components/ui/form'
import { ApiError, authApi } from '@/lib/api'
import { LANGUAGES } from '@/lib/constants'
import { useI18n } from '@/lib/i18nContext'

export default function SignUp() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [language, setLanguage] = useState<'rw' | 'en' | 'fr'>('en')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError(t('auth.passwordHint'))
      return
    }

    setBusy(true)
    try {
      const response = await authApi.register({
        full_name: fullName.trim(),
        phone: phone.trim(),
        password,
        preferred_language: language,
      })
      navigate('/verify', { replace: true, state: { phone: phone.trim() } })
      void response
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title={t('auth.signUpTitle')}
      subtitle={t('auth.signUpSubtitle')}
      hideSideDivider
      useDisplayFont
      side={{
        statement: t('auth.signUpSideStatement'),
        points: [t('auth.signUpPoint1'), t('auth.signUpPoint2'), t('auth.signUpPoint3')],
      }}
      footer={
        <p>
          {t('auth.haveAccount')}{' '}
          <Link to="/signin" className="font-medium text-ink underline decoration-rule-strong underline-offset-2 hover:decoration-ink">
            {t('nav.signIn')}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label={t('auth.fullNameLabel')} htmlFor="full-name">
          <Input
            id="full-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Uwimana Jean"
            autoComplete="name"
            minLength={2}
            maxLength={100}
            required
          />
        </Field>

        <Field label={t('auth.phoneLabel')} htmlFor="phone" hint={t('auth.phoneHint')}>
          <Input
            id="phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="0788 123 456"
            inputMode="tel"
            autoComplete="tel"
            required
          />
        </Field>

        <Field label={t('auth.passwordLabel')} htmlFor="password" hint={t('auth.passwordHint')}>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>

        <Segmented
          label={t('auth.languageLabel')}
          value={language}
          onChange={setLanguage}
          options={LANGUAGES}
          hint={t('auth.languageHint')}
        />

        {error ? <FormError>{error}</FormError> : null}

        <FormNote>{t('auth.otpNote')}</FormNote>

        <Button type="submit" loading={busy} size="lg" className="w-full">
          {t('auth.createAccountBtn')}
        </Button>
      </form>
    </AuthLayout>
  )
}
