import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslation } from 'react-i18next'

export default function TrainingBuilderTest() {
  const [count, setCount] = useState(0)
  const { t } = useTranslation('training')

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('trainingBuilderTest')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Count: {count}</p>
          <Button onClick={() => setCount(count + 1)}>{t('increment')}</Button>
        </CardContent>
      </Card>
    </div>
  )
}
