import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

export function VerifyPhonePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { verifyPhone, isLoading, error, clearError } = useAuthStore()
  
  const phone = location.state?.phone || ''
  const [code, setCode] = useState('')
  const [resendTimer, setResendTimer] = useState(60)

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendTimer])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    try {
      await verifyPhone(phone, code)
      navigate('/dashboard')
    } catch (error) {
      // Error is handled by the store
    }
  }

  const handleResend = async () => {
    // TODO: Implement resend OTP
    setResendTimer(60)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">{t('auth.verify.title')}</CardTitle>
          <CardDescription>{t('auth.verify.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="code">{t('auth.verify.code')}</Label>
              <Input
                id="code"
                type="text"
                placeholder={t('auth.verify.codePlaceholder')}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                disabled={isLoading}
                maxLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('auth.verify.submit')}
            </Button>

            <div className="text-center text-sm">
              {resendTimer > 0 ? (
                <span className="text-muted-foreground">
                  {t('auth.verify.resendIn', { seconds: resendTimer })}
                </span>
              ) : (
                <Button variant="ghost" size="sm" onClick={handleResend}>
                  {t('auth.verify.resend')}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
