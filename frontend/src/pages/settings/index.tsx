import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SettingsPage() {
  const { t } = useTranslation()

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('settings.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.profile')}</CardTitle>
          <CardDescription>{t('settings.profileDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">{t('settings.fullName')}</Label>
            <Input id="fullName" placeholder={t('settings.fullNamePlaceholder')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t('settings.email')}</Label>
            <Input id="email" type="email" placeholder={t('settings.emailPlaceholder')} />
          </div>
          <Button>{t('settings.saveChanges')}</Button>
        </CardContent>
      </Card>
    </div>
  )
}
