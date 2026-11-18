import { useState, type FormEvent } from 'react'
import { ArrowUpRight, Mail, MapPin, MessageSquare } from 'lucide-react'
import { Section, SplitHeading } from '@/components/blueprint/Blueprint'
import { BlurReveal } from '@/components/ui/blur-reveal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea, FormNote } from '@/components/ui/form'

const CONTACT_EMAIL = 'hello@itsinda.rw'

export default function Contact() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const subject = encodeURIComponent(`Itsinda enquiry — ${name || 'a savings group'}`)
    const body = encodeURIComponent(
      `${message}\n\n—\n${name}\n${phone ? `Phone: ${phone}` : ''}`.trim(),
    )
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`
  }

  return (
    <>
      <Section>
        <div className="max-w-[58ch] section-y">
          <h1 className="t-h1 mt-5 text-balance"><BlurReveal text="Tell us how your group keeps its book today" /></h1>
          <p className="mt-6 text-[16px] leading-[1.65] text-muted">
            If you are moving from a paper book, we will help you decide what to enter first and what
            can stay where it is.
          </p>
        </div>
      </Section>

      <Section tone="surface">
        <div className="grid gap-12 section-y-sm lg:grid-cols-[1fr_0.8fr] lg:gap-20">
          <form onSubmit={handleSubmit} className="max-w-[520px]">
            <SplitHeading lead="Write" trail="to us" className="!text-[26px]" />
            <div className="mt-6 flex flex-col gap-4">
              <Field label="Your name" htmlFor="contact-name">
                <Input
                  id="contact-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Uwimana Jean"
                  autoComplete="name"
                  required
                />
              </Field>
              <Field label="Phone number" htmlFor="contact-phone" optional hint="So we can call back">
                <Input
                  id="contact-phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="0788 123 456"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </Field>
              <Field label="What do you need?" htmlFor="contact-message">
                <Textarea
                  id="contact-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="We are 24 members in Musanze, monthly at 10,000 RWF, and we lend at 5% per month."
                  required
                />
              </Field>
              <FormNote>
                This opens your mail app with the message ready to send. Nothing is stored on this
                page.
              </FormNote>
              <div>
                <Button type="submit" iconAfter={<ArrowUpRight aria-hidden className="size-3.5" />}>
                  Open mail draft
                </Button>
              </div>
            </div>
          </form>

          <div className="flex flex-col gap-6 border-t border-rule pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
            <div>
              <p className="text-[11px] font-medium tracking-[0.09em] text-faint uppercase">Email</p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="mt-1.5 inline-flex items-center gap-1.5 text-[14px] text-ink hover:text-muted"
              >
                <Mail aria-hidden className="size-3.5" />
                {CONTACT_EMAIL}
              </a>
            </div>
            <div>
              <p className="text-[11px] font-medium tracking-[0.09em] text-faint uppercase">SMS</p>
              <p className="mt-1.5 flex items-center gap-1.5 text-[14px] text-ink">
                <MessageSquare aria-hidden className="size-3.5" />
                Use the form, we reply by SMS
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium tracking-[0.09em] text-faint uppercase">Office</p>
              <p className="mt-1.5 flex items-center gap-1.5 text-[14px] text-ink">
                <MapPin aria-hidden className="size-3.5" />
                Kigali, Rwanda
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">
                Weekdays, 08:00–17:00 CAT.
              </p>
            </div>
            <div className="rounded-xl border border-rule bg-paper px-3 py-2.5">
              <p className="text-[12px] leading-relaxed text-muted">
                Include your district, member count, contribution amount and whether the group lends.
                That is enough for us to answer in one reply.
              </p>
            </div>
          </div>
        </div>
      </Section>
    </>
  )
}
