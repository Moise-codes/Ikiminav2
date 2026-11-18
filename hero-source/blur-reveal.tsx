import { useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'

/**
 * Splits children text into words and animates each word from a blurred,
 * translated state into place — mirroring Aoutive's hero text reveal.
 */
export function BlurReveal({
  text,
  className,
  delay = 0,
  step = 0.06,
}: {
  text: string
  className?: string
  delay?: number
  step?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const words = el.querySelectorAll<HTMLSpanElement>('[data-br-word]')
    words.forEach((w, i) => {
      w.style.opacity = '0.001'
      w.style.filter = 'blur(10px)'
      w.style.transform = 'translateY(10px)'
      w.style.transition = `opacity 0.6s ease ${delay + i * step}s, filter 0.6s ease ${delay + i * step}s, transform 0.6s ease ${delay + i * step}s`
    })
    // trigger
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        words.forEach((w) => {
          w.style.opacity = '1'
          w.style.filter = 'blur(0px)'
          w.style.transform = 'translateY(0px)'
        })
      })
    })
  }, [text, delay, step])

  const words = text.split(' ')
  return (
    <span ref={ref} className={cn('inline', className)}>
      {words.map((w, i) => (
        <span key={i} data-br-word style={{ display: 'inline-block' }}>
          {w}
          {i < words.length - 1 ? '\u00A0' : ''}
        </span>
      ))}
    </span>
  )
}
