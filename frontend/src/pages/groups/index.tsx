import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Users } from 'lucide-react'

export function GroupsPage() {
  const { t } = useTranslation()

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('groups.title')}</h1>
          <p className="text-muted-foreground mt-2">{t('groups.subtitle')}</p>
        </div>
        <Link to="/groups/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t('groups.create')}
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('groups.noGroups')}</h3>
          <p className="text-muted-foreground mb-4">{t('groups.createFirst')}</p>
          <Link to="/groups/new">
            <Button>{t('groups.create')}</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
