import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Menu, X, User, Settings, LogOut, Globe } from 'lucide-react'
import { useState } from 'react'
import itsindaLogo from '@/assets/itsinda-mark.svg'

export function Header() {
  const { t, i18n } = useTranslation()
  const { user, isAuthenticated, logout } = useAuthStore()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navigation = [
    { name: t('common.dashboard'), href: '/dashboard' },
    { name: t('common.groups'), href: '/groups' },
    { name: t('common.contributions'), href: '/contributions' },
    { name: t('common.loans'), href: '/loans' },
    { name: t('common.reports'), href: '/reports' },
  ]

  const isActive = (href: string) => location.pathname === href

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
    localStorage.setItem('i18nextLng', lng)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <img src={itsindaLogo} alt="Itsinda" className="h-8 w-8" />
          <span className="text-xl font-bold">Itsinda</span>
        </Link>

        {/* Desktop Navigation */}
        {isAuthenticated && (
          <nav className="hidden md:flex items-center space-x-6">
            {navigation.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`text-sm font-medium transition-colors hover:text-foreground ${
                  isActive(item.href) ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        )}

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Language Switcher */}
          <div className="flex items-center space-x-1">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <select
              value={i18n.language}
              onChange={(e) => changeLanguage(e.target.value)}
              className="text-sm bg-transparent border-none focus:outline-none cursor-pointer"
            >
              <option value="rw">RW</option>
              <option value="en">EN</option>
              <option value="fr">FR</option>
            </select>
          </div>

          {/* Auth buttons */}
          {isAuthenticated ? (
            <div className="flex items-center space-x-2">
              <Link to="/profile">
                <Button variant="ghost" size="sm">
                  <User className="h-4 w-4 mr-2" />
                  {user?.full_name || t('common.profile')}
                </Button>
              </Link>
              <Link to="/settings">
                <Button variant="ghost" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  {t('common.login')}
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm">
                  {t('common.register')}
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && isAuthenticated && (
        <div className="md:hidden border-t bg-background">
          <nav className="container py-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`block px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-accent ${
                  isActive(item.href) ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
