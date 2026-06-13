import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Plug } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export default function PMSConfiguration() {
    const { t } = useTranslation(['operations', 'common'])

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" aria-label={t('accessibility.back_to_operations', 'Back to Operations')} asChild>
                    <Link to="/operations">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {t('operations:config.title', 'PMS Configuration')}
                    </h1>
                    <p className="text-muted-foreground">
                        {t('operations:config.subtitle', 'Manage Property Management System integrations')}
                    </p>
                </div>
            </div>

            <Card className="max-w-md">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <Plug className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                            <CardTitle>Feature Not Available</CardTitle>
                            <CardDescription>PMS integration has been removed</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        The PMS configuration module is no longer available. Please contact your system administrator for alternative data import options.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
