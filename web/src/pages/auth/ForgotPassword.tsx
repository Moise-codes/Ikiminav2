import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Field, FormError, FormNote, Input } from '@/components/ui/form'
import { ApiError, authApi } from '@/lib/api'
import { useI18n } from '@/lib/i18nContext'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await authApi.forgotPassword(phone.trim())
      navigate('/reset', { state: { phone: phone.trim() } })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title={t('auth.forgotTitle')}
      subtitle={t('auth.forgotSubtitle')}
      footer={
        <p>
          {t('auth.remembered')}{' '}
          <Link to="/signin" className="font-medium text-ink underline decoration-rule-strong underline-offset-2 hover:decoration-ink">
            {t('nav.signIn')}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label={t('auth.phoneLabel')} htmlFor="phone" hint={t('auth.phoneOnAccount')}>
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

        {error ? <FormError>{error}</FormError> : null}

        <FormNote>{t('auth.forgotNote')}</FormNote>

        <Button type="submit" loading={busy} size="lg" className="w-full">
          {t('auth.sendResetCode')}
        </Button>
      </form>
    </AuthLayout>
  )
}
