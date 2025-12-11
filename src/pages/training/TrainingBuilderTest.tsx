import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TrainingBuilderTest() {
  const [count, setCount] = useState(0)

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Training Builder Test</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Count: {count}</p>
          <Button onClick={() => setCount(count + 1)}>Increment</Button>
        </CardContent>
      </Card>
    </div>
  )
}
