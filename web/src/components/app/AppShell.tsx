import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { LogOut, Menu as MenuIcon, Settings, X } from 'lucide-react'
import { Wordmark } from '@/components/ui/Logo'
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
} from '@/components/ui/overlay'
import { useSession } from '@/lib/session'
import { useGroups } from '@/lib/queries'
import { initials, phonePretty } from '@/lib/format'
import { cn } from '@/lib/cn'
import { APP_NAV } from '@/lib/constants'

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Sections" className="flex flex-col">
      {APP_NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/app'}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center justify-between border-b border-rule/70 py-2.5 text-[13px] transition-colors',
              isActive ? 'font-medium text-ink' : 'text-muted hover:text-ink',
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

export function AppShell() {
  const { user, signOut } = useSession()
  const groups = useGroups()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const primaryGroups = groups.data?.items.slice(0, 6) ?? []

  async function handleSignOut(allSessions: boolean) {
    await signOut(allSessions)
    navigate('/signin', { replace: true })
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-30 border-b border-rule bg-paper/92 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-[1320px] items-center gap-4 px-4 sm:px-6">
          <Wordmark to="/app" />
          <span aria-hidden className="hidden h-4 w-px bg-rule sm:block" />
          <p className="hidden text-[12px] text-muted sm:block">Group ledger</p>

          <div className="ml-auto flex items-center gap-1.5">
            <Link
              to="/app/groups/new"
              className="hidden text-[12px] text-muted transition-colors hover:text-ink sm:block"
            >
              New group
            </Link>

            <Menu>
              <MenuTrigger
                aria-label="Account menu"
                className="flex items-center gap-2 rounded-xl border border-rule-strong py-1 pl-1 pr-2 transition-colors hover:border-ink"
              >
                <span className="flex size-6 items-center justify-center rounded-xs bg-ink text-[10px] font-medium text-white">
                  {initials(user?.full_name ?? '?')}
                </span>
                <span className="hidden max-w-[120px] truncate text-[12px] text-ink sm:block">
                  {user?.full_name ?? 'Account'}
                </span>
              </MenuTrigger>
              <MenuContent>
                <MenuLabel>{phonePretty(user?.phone ?? null)}</MenuLabel>
                <MenuItem onSelect={() => navigate('/app/settings')}>
                  <Settings aria-hidden className="size-3.5" />
                  Settings
                </MenuItem>
                <MenuSeparator />
                <MenuItem onSelect={() => void handleSignOut(false)}>
                  <LogOut aria-hidden className="size-3.5" />
                  Sign out
                </MenuItem>
                <MenuItem destructive onSelect={() => void handleSignOut(true)}>
                  <LogOut aria-hidden className="size-3.5" />
                  Sign out everywhere
                </MenuItem>
              </MenuContent>
            </Menu>

            <DialogPrimitive.Root open={mobileOpen} onOpenChange={setMobileOpen}>
              <DialogPrimitive.Trigger
                aria-label="Open navigation"
                className="inline-flex size-8 items-center justify-center rounded-xl border border-rule-strong lg:hidden"
              >
                <MenuIcon aria-hidden className="size-4" />
              </DialogPrimitive.Trigger>
              <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-ink/20 lg:hidden" />
                <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-rule-strong bg-surface px-5 py-4 lg:hidden">
                  <div className="flex items-center justify-between">
                    <Wordmark to="/app" />
                    <DialogPrimitive.Close aria-label="Close navigation" className="rounded-xl p-1">
                      <X aria-hidden className="size-4" />
                    </DialogPrimitive.Close>
                  </div>
                  <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
                  <div className="mt-6">
                    <NavItems onNavigate={() => setMobileOpen(false)} />
                  </div>
                  <div className="mt-auto pt-6">
                    <p className="t-eyebrow">Your groups</p>
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {primaryGroups.map((group) => (
                        <li key={group.id}>
                          <Link
                            to={`/app/groups/${group.id}`}
                            onClick={() => setMobileOpen(false)}
                            className="block truncate text-[13px] text-muted hover:text-ink"
                          >
                            {group.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </DialogPrimitive.Content>
              </DialogPrimitive.Portal>
            </DialogPrimitive.Root>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1320px]">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-[220px] shrink-0 flex-col border-r border-rule px-5 py-6 lg:flex">
          <NavItems />

          <div className="mt-6">
            <p className="t-eyebrow">Your groups</p>
            <ul className="mt-2 flex flex-col">
              {groups.isLoading
                ? Array.from({ length: 3 }).map((_, index) => (
                    <li key={index} className="py-1.5">
                      <div className="h-3 w-3/4 animate-pulse rounded-xs bg-paper-2" />
                    </li>
                  ))
                : primaryGroups.map((group) => (
                    <li key={group.id}>
                      <Link
                        to={`/app/groups/${group.id}`}
                        className="flex items-center justify-between gap-2 border-b border-rule/60 py-2 text-[12px] text-muted transition-colors hover:text-ink"
                      >
                        <span className="truncate">{group.name}</span>
                        <span className="tnum shrink-0 text-[10px] text-faint">
                          {group.frequency === 'weekly' ? 'W' : group.frequency === 'monthly' ? 'M' : '2M'}
                        </span>
                      </Link>
                    </li>
                  ))}
            </ul>
            {!groups.isLoading && primaryGroups.length === 0 ? (
              <p className="mt-1 text-[11px] leading-relaxed text-faint">
                No groups yet. Create one to start the book.
              </p>
            ) : null}
            <Link
              to="/app/groups/new"
              className="mt-3 inline-flex text-[11px] font-medium text-ink underline decoration-rule-strong underline-offset-2 hover:decoration-ink"
            >
              Create a group
            </Link>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
