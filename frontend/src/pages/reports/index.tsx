import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'
import { FileText } from 'lucide-react'

export function ReportsPage() {
  const { t } = useTranslation()

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('reports.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('reports.subtitle')}</p>
      </div>

      <Card>
        <CardContent className="p-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('reports.noData')}</h3>
          <p className="text-muted-foreground">{t('reports.noDataDesc')}</p>
        </CardContent>
      </Card>
    </div>
  )
}
