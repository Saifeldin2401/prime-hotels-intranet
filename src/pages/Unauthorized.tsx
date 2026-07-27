import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

export default function Unauthorized() {
  const navigate = useNavigate()
  const { t } = useTranslation('common')

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto mb-6 max-w-[200px]">
             <img src="/altus-logo-light.png" alt="Altus" className="h-24 w-auto mx-auto object-contain" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-600">{t('errors.unauthorized')}</CardTitle>
          <CardDescription className="text-base">{t('errors.unauthorized_description')}</CardDescription>
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

