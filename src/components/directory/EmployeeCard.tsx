import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Briefcase, Building, Mail, MapPin, MessageSquare, Phone, UserCircle, Users } from 'lucide-react'
import { useState } from 'react'
import { LazyLoadImage } from 'react-lazy-load-image-component'
import 'react-lazy-load-image-component/src/effects/blur.css'
import { useNavigate } from 'react-router-dom'

interface EmployeeCardProps {
    profile
    isRTL: boolean
}

export function EmployeeCard({ profile, isRTL }: EmployeeCardProps) {
    const [imageError, setImageError] = useState(false)
    const navigate = useNavigate()

    const propertyName =
        profile?.properties?.[0]?.name ||
        profile?.primary_property_name ||
        profile?.property_name ||
        null
    const departmentName =
        profile?.departments?.[0]?.name ||
        profile?.primary_department_name ||
        profile?.department_name ||
        null

    return (
        <Card className="overflow-hidden hover:shadow-md transition-shadow h-full">
            <CardHeader className="p-0">
                <div className="h-20 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
                    <Avatar className={`h-20 w-20 absolute -bottom-10 border-4 border-white shadow-sm ring-1 ring-gray-100 ${isRTL ? 'right-6' : 'left-6'}`}>
                        {!imageError && profile.avatar_url ? (
                            <LazyLoadImage
                                alt={profile.full_name}
                                src={profile.avatar_url}
                                effect="blur"
                                className="aspect-square h-full w-full object-cover"
                                wrapperClassName="aspect-square h-full w-full"
                                onError={() => setImageError(true)}
                            />
                        ) : (
                            <AvatarFallback className="bg-slate-100 text-slate-600 text-xl font-medium">
                                {profile.full_name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        )}
                    </Avatar>
                </div>
            </CardHeader>
            <CardContent className="pt-12 px-6 pb-6">
                <div className="space-y-1 mb-4">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            className="font-bold text-lg leading-tight truncate text-start hover:text-primary transition-colors"
                            title={profile.full_name}
                            onClick={() => navigate(`/profile/${profile.id}`)}
                        >
                            {profile.full_name}
                        </button>
                        {profile.staff_id && (
                            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono border">
                                {profile.staff_id}
                            </span>
                        )}
                    </div>
                    {profile.job_title && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <Briefcase className="h-3.5 w-3.5" />
                            <span className="truncate">{profile.job_title}</span>
                        </div>
                    )}
                    {typeof profile?.is_active === 'boolean' && (
                        <Badge variant={profile.is_active ? 'default' : 'secondary'} className="mt-1 w-fit">
                            {profile.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                    )}
                </div>

                <div className="space-y-2.5 text-sm text-gray-600">
                    {/* Manager / Reports To */}
                    {profile.manager_name && (
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-400 shrink-0" />
                            <span className="truncate text-xs">
                                Reports to: <span className="font-medium">{profile.manager_name}</span>
                            </span>
                        </div>
                    )}
                    {departmentName && (
                        <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-gray-400 shrink-0" />
                            <span className="truncate">{departmentName}</span>
                        </div>
                    )}
                    {propertyName && (
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                            <span className="truncate">{propertyName}</span>
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

                <div className="mt-4 flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/profile/${profile.id}`)}
                    >
                        <UserCircle className="h-3.5 w-3.5 me-1.5" />
                        Profile
                    </Button>
                    <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/messaging?startChatWith=${profile.id}`)}
                    >
                        <MessageSquare className="h-3.5 w-3.5 me-1.5" />
                        Message
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
