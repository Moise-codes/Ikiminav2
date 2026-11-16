import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, Plus } from 'lucide-react'

export function LoansPage() {
  const { t } = useTranslation()

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('loans.title')}</h1>
          <p className="text-muted-foreground mt-2">{t('loans.subtitle')}</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t('loans.request')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-12 text-center">
          <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('loans.noLoans')}</h3>
          <p className="text-muted-foreground mb-4">{t('loans.requestFirst')}</p>
          <Button>{t('loans.request')}</Button>
        </CardContent>
      </Card>
    </div>
  )
}
