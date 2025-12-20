import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslation } from 'react-i18next'

export default function TrainingBuilderTest() {
  const [count, setCount] = useState(0)
  const { t, i18n } = useTranslation('training')
  const isRTL = i18n.dir() === 'rtl'

  return (
    <div className={`p-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      <Card>
        <CardHeader>
          <CardTitle>{t('test.trainingBuilderTest')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t('test.count')}: {count}</p>
          <Button onClick={() => setCount(count + 1)}>{t('test.increment')}</Button>
        </CardContent>
      </Card>
    </div>
  )
}
