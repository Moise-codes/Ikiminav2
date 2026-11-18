import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Section } from '@/components/blueprint/Blueprint'
import { buttonClass } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <Section>
      <div className="flex min-h-[60vh] flex-col justify-center py-16">
        <p className="t-eyebrow">404</p>
        <h1 className="t-h1 mt-4 max-w-[18ch] text-balance">This page is not in the book</h1>
        <p className="mt-4 max-w-[46ch] text-[14px] leading-relaxed text-muted">
          The link may be old, or the record may have moved. Your group’s ledger is where it was.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link to="/app" className={buttonClass('ink', 'md')}>
            Go to the ledger
          </Link>
          <Link to="/" className={buttonClass('outline', 'md')}>
            <ArrowLeft aria-hidden className="size-3.5" />
            Home
          </Link>
        </div>
      </div>
    </Section>
  )
}
