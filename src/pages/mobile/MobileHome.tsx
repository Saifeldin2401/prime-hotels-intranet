import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { format } from 'date-fns'
import { Calendar, CheckSquare, PlusCircle, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function MobileHome() {
    const { user } = useAuth()
    const { t: _t } = useTranslation('common')

    const firstName = user?.user_metadata?.first_name || 'Staff'
    const timeGreeting = new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 18 ? 'Good Afternoon' : 'Good Evening'

    return (
        <div className="space-y-6 pb-20">
            {/* Hero Section */}
            <section className="flex items-center justify-between py-2">
                <div>
                    <p className="text-sm text-muted-foreground font-medium animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
                        {timeGreeting},
                    </p>
                    <h1 className="text-2xl font-bold text-hotel-navy animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
                        {firstName}
                    </h1>
                </div>
                <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                        <AvatarImage src={user?.user_metadata?.avatar_url} />
                        <AvatarFallback className="bg-hotel-gold/10 text-hotel-gold font-bold">
                            {firstName[0]}
                        </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 end-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white"></span>
                </div>
            </section>

            {/* Context / Status Card */}
            <Card className="bg-gradient-to-r from-hotel-navy to-hotel-navy-light text-white border-none p-4 shadow-card-sm relative overflow-hidden">
                <div className="absolute top-0 end-0 -mt-2 -me-2 w-20 h-20 bg-white/5 rounded-full blur-xl"></div>
                <div className="relative z-10 flex justify-between items-center">
                    <div>
                        <p className="text-xs text-white/70 uppercase tracking-wider mb-1">Current Status</p>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-white/20 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm">
                                On Shift
                            </Badge>
                            <span className="text-sm font-medium h-1 w-1 bg-white/50 rounded-full"></span>
                            <span className="text-sm font-medium">Front Desk</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-bold">{format(new Date(), 'h:mm a')}</p>
                        <p className="text-xs text-white/70">{format(new Date(), 'EEE, MMM d')}</p>
                    </div>
                </div>
            </Card>

            {/* Quick Actions Grid */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-4 rounded-xl border border-border/50 shadow-sm flex flex-col gap-3 active:scale-[0.98] transition-transform">
                        <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <PlusCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-semibold text-sm">New Request</p>
                            <p className="text-xs text-muted-foreground">Create task or ticket</p>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-border/50 shadow-sm flex flex-col gap-3 active:scale-[0.98] transition-transform">
                        <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                            <CheckSquare className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-semibold text-sm">My Tasks</p>
                            <p className="text-xs text-muted-foreground">3 pending items</p>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-border/50 shadow-sm flex flex-col gap-3 active:scale-[0.98] transition-transform">
                        <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-semibold text-sm">Schedule</p>
                            <p className="text-xs text-muted-foreground">View timeline</p>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-border/50 shadow-sm flex flex-col gap-3 active:scale-[0.98] transition-transform">
                        <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <Search className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-semibold text-sm">Find Guest</p>
                            <p className="text-xs text-muted-foreground">Search database</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Smart Feed / "Up Next" */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-foreground">Up Next</h2>
                    <Button variant="link" size="sm" className="h-auto p-0 text-hotel-primary">See all</Button>
                </div>

                <div className="space-y-3">
                    {/* Feed Item 1: High Priority Task */}
                    <div className="bg-white p-4 rounded-xl border-l-4 border-l-red-500 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <Badge variant="secondary" className="bg-red-50 text-red-700 hover:bg-red-100">High Priority</Badge>
                            <span className="text-xs text-muted-foreground">10m ago</span>
                        </div>
                        <h3 className="font-semibold text-sm mb-1">Room 304 - AC Malfunction</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                            Guest reported loud noise from the AC unit. Needs immediate inspection by maintenance.
                        </p>
                        <div className="mt-3 flex items-center justify-end gap-2">
                            <Button size="sm" variant="ghost" className="h-7 text-xs">Dismiss</Button>
                            <Button size="sm" className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white">Accept</Button>
                        </div>
                    </div>

                    {/* Feed Item 2: News / Announcement */}
                    <div className="bg-white p-4 rounded-xl border border-border/50 shadow-sm">
                        <div className="flex gap-3">
                            <div className="h-16 w-16 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=200" alt="News" className="h-full w-full object-cover" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-[10px] h-4 px-1">Announcement</Badge>
                                    <span className="text-[10px] text-muted-foreground">2h ago</span>
                                </div>
                                <h3 className="font-semibold text-sm leading-tight mb-1">New Staff Canteen Menu</h3>
                                <p className="text-xs text-muted-foreground">
                                    Check out the updated menu for next week starting Sunday...
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
