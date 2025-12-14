import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function Unauthorized() {
  const navigate = useNavigate()
  const { t } = useTranslation('common')

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('errors.unauthorized')}</CardTitle>
          <CardDescription>{t('errors.unauthorized_description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => navigate('/')} className="w-full">
            {t('errors.go_to_home')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

