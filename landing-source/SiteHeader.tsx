import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ArrowRight, Menu, X } from 'lucide-react'
import { MARKETING_NAV } from '@/lib/constants'
import { cn } from '@/lib/cn'
import { Wordmark } from '@/components/ui/Logo'
import { buttonClass } from '@/components/ui/Button'

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => setOpen(false), [location.pathname])

  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-paper/90 backdrop-blur-md">
      <div className="relative mx-auto flex h-16 w-full max-w-[1240px] items-center gap-6 border-x border-rule px-6 sm:px-8 lg:px-12">
        <Wordmark />

        <nav aria-label="Primary" className="ml-4 hidden items-center gap-6 md:flex">
          {MARKETING_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'text-[13px] transition-colors',
                  isActive ? 'text-ink' : 'text-muted hover:text-ink',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link to="/signin" className="hidden text-[13px] text-muted transition-colors hover:text-ink sm:block">
            Sign in
          </Link>
          <Link to="/signup" className={buttonClass('ink', 'sm', 'hidden sm:inline-flex')}>
            Create a group
          </Link>

          <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
            <DialogPrimitive.Trigger
              aria-label="Open menu"
              className="inline-flex size-9 items-center justify-center rounded-xl border border-rule-strong text-ink md:hidden"
            >
              <Menu aria-hidden className="size-4" />
            </DialogPrimitive.Trigger>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-[1px] md:hidden" />
              <DialogPrimitive.Content className="fixed inset-x-0 top-0 z-50 border-b border-rule-strong bg-surface px-6 pb-6 pt-4 md:hidden">
                <div className="flex items-center justify-between">
                  <Wordmark />
                  <DialogPrimitive.Close
                    aria-label="Close menu"
                    className="inline-flex size-9 items-center justify-center rounded-xl border border-rule-strong"
                  >
                    <X aria-hidden className="size-4" />
                  </DialogPrimitive.Close>
                </div>
                <DialogPrimitive.Title className="sr-only">Menu</DialogPrimitive.Title>
                <nav aria-label="Mobile" className="mt-5 flex flex-col">
                  {MARKETING_NAV.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="border-b border-rule py-3 text-[15px] text-ink"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
                <div className="mt-5 flex flex-col gap-2">
                  <Link to="/signup" className={buttonClass('ink', 'md', 'w-full')}>
                    Create a group
                    <ArrowRight aria-hidden className="size-3.5" />
                  </Link>
                  <Link to="/signin" className={buttonClass('outline', 'md', 'w-full')}>
                    Sign in
                  </Link>
                </div>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
        </div>
      </div>
    </header>
  )
}
