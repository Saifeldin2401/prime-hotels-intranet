
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, GraduationCap, Megaphone, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from 'react-i18next'

export function QuickActionsWidget() {
    const { primaryRole } = useAuth()
    const { t } = useTranslation('dashboard')

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('widgets.quick_actions')}</CardTitle>
                <CardDescription>{t('widgets.quick_actions_desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                <Link to="/documents">
                    <Button variant="outline" className="w-full justify-start group">
                        <FileText className="w-4 h-4 mr-2 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-12" />
                        {t('widgets.view_documents')}
                    </Button>
                </Link>
                <Link to="/training">
                    <Button variant="outline" className="w-full justify-start group">
                        <GraduationCap className="w-4 h-4 mr-2 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                        {t('widgets.view_training')}
                    </Button>
                </Link>
                <Link to="/announcements">
                    <Button variant="outline" className="w-full justify-start group">
                        <Megaphone className="w-4 h-4 mr-2 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-12" />
                        {t('widgets.view_announcements')}
                    </Button>
                </Link>
                {(primaryRole === 'regional_admin' || primaryRole === 'regional_hr') && (
                    <Link to="/admin/users">
                        <Button variant="outline" className="w-full justify-start group">
                            <Users className="w-4 h-4 mr-2 transition-transform duration-300 group-hover:scale-110" />
                            {t('widgets.manage_users')}
                        </Button>
                    </Link>
                )}
            </CardContent>
        </Card>
    )
}
