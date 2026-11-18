import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { Button } from '@/components/ui/Button'
import { CodeInput, Field, FormError, FormNote, Input } from '@/components/ui/form'
import { ApiError, authApi } from '@/lib/api'
import { useSession } from '@/lib/session'
import { useI18n } from '@/lib/i18nContext'

export default function VerifyPhone() {
  const navigate = useNavigate()
  const location = useLocation()
  const { startSession } = useSession()
  const { t } = useI18n()
  const initialPhone = (location.state as { phone?: string } | null)?.phone ?? ''

  const [phone, setPhone] = useState(initialPhone)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [resendIn, setResendIn] = useState(30)

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = window.setInterval(() => setResendIn((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [resendIn])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const response = await authApi.verifyPhone(phone.trim(), code.trim())
      startSession(response)
      toast.success(t('auth.verifyBtn'))
      navigate('/app', { replace: true })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  async function handleResend() {
    setError(null)
    try {
      await authApi.resendOtp(phone.trim())
      setResendIn(30)
      toast.success(t('auth.sendNewCode'))
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not resend the code.')
    }
  }

  return (
    <AuthLayout
      title={t('auth.verifyTitle')}
      subtitle={t('auth.verifySubtitle')}
      side={{
        statement: t('auth.verifySideStatement'),
        points: [t('auth.verifyPoint1'), t('auth.verifyPoint2'), t('auth.verifyPoint3')],
      }}
      footer={
        <p>
          {t('auth.wrongNumber')}{' '}
          <Link to="/signup" className="font-medium text-ink underline decoration-rule-strong underline-offset-2 hover:decoration-ink">
            {t('auth.startAgain')}
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
        ) : (
          <div className="flex items-center justify-between border-b border-rule pb-2">
            <span className="text-[12px] text-muted">{t('auth.codeSentTo')}</span>
            <span className="tnum text-[13px] font-medium text-ink">{initialPhone}</span>
          </div>
        )}

        <Field label={t('auth.codeLabel')} htmlFor="code">
          <CodeInput
            id="code"
            name="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            required
          />
        </Field>

        {error ? <FormError>{error}</FormError> : null}

        {import.meta.env.DEV ? (
          <FormNote>
            Development: the SMS provider is set to <code>fake</code>, so the code is printed in the
            API container logs rather than sent to a handset.
          </FormNote>
        ) : null}

        <Button type="submit" loading={busy} size="lg" className="w-full" disabled={code.length !== 6}>
          {t('auth.verifyBtn')}
        </Button>

        <div className="flex items-center justify-between text-[12px]">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendIn > 0}
            className="font-medium text-ink underline decoration-rule-strong underline-offset-2 transition-colors hover:decoration-ink disabled:text-faint disabled:no-underline"
          >
            {t('auth.sendNewCode')}
          </button>
          <span className="text-faint">
            {resendIn > 0 ? `${t('auth.availableIn')} ${resendIn}s` : t('auth.ready')}
          </span>
        </div>
      </form>
    </AuthLayout>
  )
}
