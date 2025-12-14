
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { ROLES } from '@/lib/constants'
import { useTranslation } from 'react-i18next'

export function RoleWidget() {
    const { primaryRole, properties, departments } = useAuth()
    const { t } = useTranslation(['dashboard', 'common'])

    // Initial check to avoid errors if primaryRole is undefined
    if (!primaryRole) return null;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('widgets.role')}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {t(`common:roles.${primaryRole}`, { defaultValue: ROLES[primaryRole]?.label })}
                </div>
                <p className="text-xs text-muted-foreground">
                    {properties.length} {t('widgets.properties')} • {departments.length} {t('widgets.departments')}
                </p>
            </CardContent>
        </Card>
    )
}
