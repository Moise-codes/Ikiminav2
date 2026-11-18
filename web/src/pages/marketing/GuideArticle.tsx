import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Section } from '@/components/blueprint/Blueprint'
import { CloseCta } from '@/components/marketing/sections'
import { findGuide } from './guideContent'
import NotFound from '../NotFound'

export default function GuideArticle() {
  const { slug } = useParams()
  const guide = findGuide(slug)

  if (!guide) return <NotFound />

  return (
    <>
      <Section>
        <div className="section-y">
          <Link
            to="/guides"
            className="inline-flex items-center gap-1.5 text-[12px] text-muted transition-colors hover:text-ink"
          >
            <ArrowLeft aria-hidden className="size-3.5" />
            All guides
          </Link>
          <div className="mt-6 max-w-[68ch]">
            <h1 className="t-h1 mt-4 text-balance">{guide.title}</h1>
            <p className="mt-5 text-[15px] leading-relaxed text-muted">{guide.summary}</p>
          </div>
        </div>
      </Section>

      <Section tone="surface">
        <article className="max-w-[66ch] section-y">{guide.body}</article>
      </Section>

      <CloseCta />
    </>
  )
}
