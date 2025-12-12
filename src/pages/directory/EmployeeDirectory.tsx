import { useState } from 'react'
import { useProfiles } from '@/hooks/useUsers'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Mail, Phone, MapPin, Building, Search, Loader2, User, Briefcase } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function EmployeeDirectory() {
    const { t, i18n } = useTranslation('directory')
    const [search, setSearch] = useState('')
    const isRTL = i18n.dir() === 'rtl'

    const { data: profiles = [], isLoading, error } = useProfiles({ search })

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                    <p className="text-muted-foreground">{t('description')}</p>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className={`absolute top-2.5 h-4 w-4 text-gray-500 ${isRTL ? 'right-2.5' : 'left-2.5'}`} />
                    <Input
                        type="search"
                        placeholder={t('search_placeholder')}
                        className={isRTL ? 'pr-9' : 'pl-9'}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : error ? (
                <div className="text-center py-12 border rounded-lg bg-red-50 text-red-700">
                    <User className="h-12 w-12 mx-auto text-red-300 mb-4" />
                    <h3 className="text-lg font-medium">Directory is temporarily unavailable</h3>
                    <p className="mt-2 text-sm opacity-80">{(error as any).message ?? 'There was a problem loading employee data.'}</p>
                </div>
            ) : profiles.length === 0 ? (
                <div className="text-center py-12 border rounded-lg bg-muted/20">
                    <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium">{t('no_results')}</h3>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {profiles.map((profile: any) => (
                        <Card key={profile.id} className="overflow-hidden hover:shadow-md transition-shadow">
                            <CardHeader className="p-0">
                                <div className="h-20 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
                                    <Avatar className={`h-20 w-20 absolute -bottom-10 border-4 border-white shadow-sm ring-1 ring-gray-100 ${isRTL ? 'right-6' : 'left-6'}`}>
                                        <AvatarImage src={profile.avatar_url || ''} />
                                        <AvatarFallback className="bg-slate-100 text-slate-600 text-xl font-medium">
                                            {profile.full_name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-12 px-6 pb-6">
                                <div className="space-y-1 mb-4">
                                    <h3 className="font-bold text-lg leading-tight truncate" title={profile.full_name}>
                                        {profile.full_name}
                                    </h3>
                                    {profile.job_title && (
                                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                            <Briefcase className="h-3.5 w-3.5" />
                                            <span className="truncate">{profile.job_title}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2.5 text-sm text-gray-600">
                                    {profile.departments?.[0] && (
                                        <div className="flex items-center gap-2">
                                            <Building className="h-4 w-4 text-gray-400 shrink-0" />
                                            <span className="truncate">{profile.departments[0].name}</span>
                                        </div>
                                    )}
                                    {profile.properties?.[0] && (
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                                            <span className="truncate">{profile.properties[0].name}</span>
                                        </div>
                                    )}
                                    {profile.email && (
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                                            <a href={`mailto:${profile.email}`} className="hover:text-primary hover:underline truncate">
                                                {profile.email}
                                            </a>
                                        </div>
                                    )}
                                    {profile.phone && (
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                                            <a href={`tel:${profile.phone}`} className="hover:text-primary hover:underline truncate" dir="ltr">
                                                {profile.phone}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
