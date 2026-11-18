import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { Button } from '@/components/ui/Button'
import { CodeInput, Field, FormError, Input } from '@/components/ui/form'
import { ApiError, authApi } from '@/lib/api'
import { useI18n } from '@/lib/i18nContext'

export default function ResetPassword() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useI18n()
  const initialPhone = (location.state as { phone?: string } | null)?.phone ?? ''

  const [phone, setPhone] = useState(initialPhone)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await authApi.resetPassword(phone.trim(), code.trim(), password)
      toast.success(t('auth.changePasswordBtn'))
      navigate('/signin', { replace: true })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title={t('auth.resetTitle')}
      subtitle={t('auth.resetSubtitle')}
      footer={
        <p>
          {t('auth.needNewCode')}{' '}
          <Link to="/forgot" className="font-medium text-ink underline decoration-rule-strong underline-offset-2 hover:decoration-ink">
            {t('auth.sendAnother')}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!initialPhone ? (
          <Field label={t('auth.phoneLabel')} htmlFor="phone">
            <Input
              id="phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="0788 123 456"
              inputMode="tel"
              required
            />
          </Field>
        ) : null}

        <Field label={t('auth.codeLabel')} htmlFor="code">
          <CodeInput
            id="code"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            required
          />
        </Field>

        <Field label={t('auth.newPasswordLabel')} htmlFor="new-password" hint={t('auth.passwordHint')}>
          <Input
            id="new-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>

        {error ? <FormError>{error}</FormError> : null}

        <Button
          type="submit"
          loading={busy}
          size="lg"
          className="w-full"
          disabled={code.length !== 6 || password.length < 8}
        >
          {t('auth.changePasswordBtn')}
        </Button>
      </form>
    </AuthLayout>
  )
}
