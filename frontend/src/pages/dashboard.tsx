import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, TrendingUp, DollarSign, FileText, Plus, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export function DashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()

  const stats = [
    {
      title: t('dashboard.totalGroups'),
      value: '0',
      icon: Users,
      href: '/groups',
    },
    {
      title: t('dashboard.totalMembers'),
      value: '0',
      icon: Users,
      href: '/members',
    },
    {
      title: t('dashboard.totalContributions'),
      value: 'RWF 0',
      icon: DollarSign,
      href: '/contributions',
    },
    {
      title: t('dashboard.totalLoans'),
      value: 'RWF 0',
      icon: TrendingUp,
      href: '/loans',
    },
  ]

  const quickActions = [
    {
      title: t('dashboard.createGroup'),
      description: t('dashboard.createGroupDesc'),
      icon: Plus,
      href: '/groups/new',
    },
    {
      title: t('dashboard.recordContribution'),
      description: t('dashboard.recordContributionDesc'),
      icon: DollarSign,
      href: '/contributions/new',
    },
    {
      title: t('dashboard.requestLoan'),
      description: t('dashboard.requestLoanDesc'),
      icon: TrendingUp,
      href: '/loans/new',
    },
    {
      title: t('dashboard.viewReports'),
      description: t('dashboard.viewReportsDesc'),
      icon: FileText,
      href: '/reports',
    },
  ]

  return (
    <div className="container py-8 space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold">
          {t('dashboard.welcome', { name: user?.full_name || 'User' })}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t('dashboard.subtitle')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Link key={index} to={stat.href}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">{t('dashboard.quickActions')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link key={index} to={action.href}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <action.icon className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">{action.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-xl font-semibold mb-4">{t('dashboard.recentActivity')}</h2>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-center py-8">
              {t('dashboard.noActivity')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
