import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Field, FormError, Input } from '@/components/ui/form'
import { ApiError, authApi } from '@/lib/api'
import { useSession } from '@/lib/session'
import { useI18n } from '@/lib/i18nContext'

export default function SignIn() {
  const navigate = useNavigate()
  const location = useLocation()
  const { startSession } = useSession()
  const { t } = useI18n()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/app'

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const response = await authApi.login(phone.trim(), password)
      startSession(response)
      toast.success(response.message || t('auth.signInBtn'))
      navigate(redirectTo, { replace: true })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title={t('auth.signInTitle')}
      subtitle={t('auth.signInSubtitle')}
      hideSideDivider
      useDisplayFont
      footer={
        <p>
          {t('auth.newHere')}{' '}
          <Link to="/signup" className="font-medium text-ink underline decoration-rule-strong underline-offset-2 hover:decoration-ink">
            {t('auth.createGroup')}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
        <Field label={t('auth.passwordLabel')} htmlFor="password">
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>

        {error ? <FormError>{error}</FormError> : null}

        <Button type="submit" loading={busy} size="lg" className="mt-1 w-full">
          {t('auth.signInBtn')}
        </Button>

        <div className="flex items-center justify-between text-[12px]">
          <Link to="/forgot" className="text-muted transition-colors hover:text-ink">
            {t('auth.forgotPassword')}
          </Link>
          <span className="text-faint">{t('auth.rateLimited')}</span>
        </div>
      </form>
    </AuthLayout>
  )
}
