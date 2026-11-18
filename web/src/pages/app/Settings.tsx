import { useEffect, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { LogOut, MonitorSmartphone } from 'lucide-react'
import { PageHeader, Panel } from '@/components/app/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/feedback'
import {
  CodeInput,
  Field,
  FormError,
  FormNote,
  Input,
  Segmented,
} from '@/components/ui/form'
import { ApiError, authApi } from '@/lib/api'
import { useSession } from '@/lib/session'
import { LANGUAGES } from '@/lib/constants'
import { dateTimeLabel, phonePretty } from '@/lib/format'
import { keys } from '@/lib/queries'

export default function Settings() {
  const { user, signOut } = useSession()
  const queryClient = useQueryClient()

  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [language, setLanguage] = useState<'rw' | 'en' | 'fr'>(user?.preferred_language ?? 'en')
  const [profileError, setProfileError] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)

  const [newPhone, setNewPhone] = useState('')
  const [phoneCode, setPhoneCode] = useState('')
  const [phoneStep, setPhoneStep] = useState<'idle' | 'sent'>('idle')
  const [phoneError, setPhoneError] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      setFullName(user.full_name)
      setLanguage(user.preferred_language)
    }
  }, [user])

  const sessionsQuery = useQuery({ queryKey: keys.sessions, queryFn: authApi.sessions })

  async function saveProfile(event: FormEvent) {
    event.preventDefault()
    setProfileError(null)
    setSavingProfile(true)
    try {
      await authApi.updateMe({ full_name: fullName.trim(), preferred_language: language })
      await queryClient.invalidateQueries({ queryKey: ['me'] })
      toast.success('Profile saved')
    } catch (caught) {
      setProfileError(caught instanceof ApiError ? caught.message : 'Could not save.')
    } finally {
      setSavingProfile(false)
    }
  }

  async function requestPhoneChange() {
    setPhoneError(null)
    try {
      await authApi.changePhone(newPhone.trim())
      setPhoneStep('sent')
      toast.success('Code sent to the new number')
    } catch (caught) {
      setPhoneError(caught instanceof ApiError ? caught.message : 'Could not send the code.')
    }
  }

  async function confirmPhoneChange() {
    setPhoneError(null)
    try {
      await authApi.confirmPhoneChange(newPhone.trim(), phoneCode.trim())
      await queryClient.invalidateQueries({ queryKey: ['me'] })
      toast.success('Phone number changed')
      setPhoneStep('idle')
      setNewPhone('')
      setPhoneCode('')
    } catch (caught) {
      setPhoneError(caught instanceof ApiError ? caught.message : 'Could not confirm the change.')
    }
  }

  async function addEmail(event: FormEvent) {
    event.preventDefault()
    setEmailError(null)
    try {
      await authApi.addEmail(email.trim())
      toast.success('Verification link sent')
      setEmail('')
    } catch (caught) {
      setEmailError(caught instanceof ApiError ? caught.message : 'Could not add the email.')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Settings"
        title="Your account"
        description="The phone number is the identity. Everything else is either optional or a session you can end."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Profile">
          <form onSubmit={saveProfile} className="flex flex-col gap-4">
            <Field label="Full name" htmlFor="settings-name">
              <Input
                id="settings-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                minLength={2}
                maxLength={100}
                required
              />
            </Field>
            <Segmented
              label="Language"
              value={language}
              onChange={setLanguage}
              options={LANGUAGES}
              hint="Used for SMS and receipts."
            />
            {profileError ? <FormError>{profileError}</FormError> : null}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-faint">
                Member since {dateTimeLabel(user?.created_at)}
              </span>
              <Button type="submit" size="sm" loading={savingProfile}>
                Save
              </Button>
            </div>
          </form>
        </Panel>

        <Panel title="Phone number">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-rule pb-2.5">
              <span className="text-[12px] text-muted">Current number</span>
              <span className="tnum text-[13px] font-medium text-ink">
                {phonePretty(user?.phone ?? null)}
              </span>
            </div>

            {phoneStep === 'idle' ? (
              <>
                <Field label="New number" htmlFor="settings-new-phone" hint="Rwandan mobile">
                  <Input
                    id="settings-new-phone"
                    value={newPhone}
                    onChange={(event) => setNewPhone(event.target.value)}
                    placeholder="0788 123 456"
                    inputMode="tel"
                  />
                </Field>
                {phoneError ? <FormError>{phoneError}</FormError> : null}
                <Button variant="outline" size="sm" onClick={requestPhoneChange} disabled={newPhone.length < 9}>
                  Send confirmation code
                </Button>
              </>
            ) : (
              <>
                <Field label="Code sent to the new number" htmlFor="settings-phone-code">
                  <CodeInput
                    id="settings-phone-code"
                    value={phoneCode}
                    onChange={(event) => setPhoneCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                </Field>
                {phoneError ? <FormError>{phoneError}</FormError> : null}
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={confirmPhoneChange} disabled={phoneCode.length !== 6}>
                    Confirm change
                  </Button>
                  <Button variant="quiet" size="sm" onClick={() => setPhoneStep('idle')}>
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        </Panel>

        <Panel title="Email">
          <form onSubmit={addEmail} className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-rule pb-2.5">
              <span className="text-[12px] text-muted">Recovery email</span>
              <span className="text-[13px] text-ink">{user?.email ?? 'Not set'}</span>
            </div>
            <Field label="Add an email" htmlFor="settings-email" optional hint="Recovery only">
              <Input
                id="settings-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            {emailError ? <FormError>{emailError}</FormError> : null}
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-faint">Email is never required to sign in.</p>
              <Button type="submit" size="sm" variant="outline" disabled={!email}>
                Send link
              </Button>
            </div>
          </form>
        </Panel>

        <Panel
          title="Active sessions"
          action={
            <Button variant="quiet" size="sm" onClick={() => void signOut(true)}>
              <LogOut aria-hidden className="size-3.5" />
              Sign out everywhere
            </Button>
          }
        >
          {sessionsQuery.isLoading ? (
            <p className="text-[12px] text-muted">Reading sessions…</p>
          ) : (sessionsQuery.data ?? []).length === 0 ? (
            <p className="text-[12px] text-muted">No other sessions recorded.</p>
          ) : (
            <ul className="divide-y divide-rule">
              {(sessionsQuery.data ?? []).map((session) => (
                <li key={session.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-[12px] text-ink">
                      <MonitorSmartphone aria-hidden className="size-3.5 text-faint" />
                      {session.user_agent ?? 'Unknown device'}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {session.ip ?? 'No address'} · started {dateTimeLabel(session.created_at)}
                    </p>
                  </div>
                  {session.current ? <Badge tone="credit">This device</Badge> : null}
                </li>
              ))}
            </ul>
          )}
          <FormNote>
            A refresh token that is reused after rotation revokes the whole family — that is why
            signing in again here may end an older session.
          </FormNote>
        </Panel>
      </div>
    </div>
  )
}
