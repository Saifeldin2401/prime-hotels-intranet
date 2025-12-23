/**
 * KnowledgeHome - Main Knowledge Base Landing Page (Redesigned)
 * Acts as a personalized gateway to the Knowledge Library.
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
    Search,
    BookOpen,
    Clock,
    Star,
    AlertCircle,
    ArrowRight,
    Library,
    Plus,
    LayoutGrid,
    ChevronRight,
    ShieldCheck,
    MessageCircle
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import {
    useFeaturedArticles,
    useRecentArticles,
    useRequiredReading,
    useArticles
} from '@/hooks/useKnowledge'
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed'

export default function KnowledgeHome() {
    const { t } = useTranslation('knowledge')
    const navigate = useNavigate()
    const { user, primaryRole, departments } = useAuth()
    const [searchQuery, setSearchQuery] = useState('')

    const primaryDept = departments?.[0]

    const { data: featured } = useFeaturedArticles(4)
    const { data: required } = useRequiredReading()
    const { documents: recentlyViewed } = useRecentlyViewed(4)
    const { data: deptArticles } = useArticles({
        departmentId: primaryDept?.id,
        limit: 4
    })

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (searchQuery.trim()) {
            navigate(`/knowledge/search?q=${encodeURIComponent(searchQuery.trim())}`)
        }
    }

    const pendingRequired = required?.filter(r => !r.is_acknowledged) || []

    return (
        <div className="min-h-[calc(100vh-80px)] bg-gray-50/50 pb-12">
            {/* Premium Hero Section */}
            <div className="bg-hotel-navy relative py-20 overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-1/3 h-full bg-hotel-gold/5 -skew-x-12 transform translate-x-1/2" />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-hotel-gold/10 blur-3xl" />

                <div className="container mx-auto px-6 relative z-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <Badge className="bg-hotel-gold text-hotel-navy mb-4 hover:bg-hotel-gold border-none font-semibold px-4 py-1">
                            PRIME KNOWLEDGE HUB
                        </Badge>
                        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 font-serif">
                            {t('title')}
                        </h1>
                        <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-light">
                            {t('subtitle', 'Your centralized hub for operational knowledge')}
                        </p>
                    </motion.div>

                    {/* Integrated Search Bar */}
                    <motion.form
                        onSubmit={handleSearch}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="max-w-3xl mx-auto relative"
                    >
                        <div className="relative group shadow-2xl rounded-2xl">
                            <div className="absolute -inset-1 bg-gradient-to-r from-hotel-gold/50 to-blue-500/50 rounded-2xl blur opacity-25 group-hover:opacity-100 transition duration-1000"></div>
                            <div className="relative bg-white flex items-center p-2 rounded-xl border border-white/20">
                                <Search className="ml-4 h-6 w-6 text-gray-400" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t('search_placeholder')}
                                    className="border-0 shadow-none focus-visible:ring-0 text-lg py-8 text-gray-900 placeholder:text-gray-400 bg-transparent flex-1"
                                />
                                <Button
                                    type="submit"
                                    className="bg-hotel-navy hover:bg-hotel-navy/90 text-white rounded-lg px-8 py-7 text-base font-semibold transition-all shadow-xl"
                                >
                                    {t('search_button')}
                                </Button>
                            </div>
                        </div>
                    </motion.form>
                </div>
            </div>

            <div className="container mx-auto px-6 -mt-8 relative z-20">
                {/* Required Reading Banner (Floating) */}
                {pendingRequired.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-12"
                    >
                        <Card className="border-none shadow-xl bg-gradient-to-r from-orange-500 to-red-600 text-white overflow-hidden">
                            <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <AlertCircle size={100} />
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                                        <ShieldCheck className="h-8 w-8 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold mb-1">{t('required_reading')}</h2>
                                        <p className="text-white/80">{t('required_reading_desc')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="text-white border-white/50 text-sm py-1.5 px-4 mb-2 md:mb-0">
                                        {pendingRequired.length} {t('library.pending', 'Pending')}
                                    </Badge>
                                    <Button asChild className="bg-white text-orange-600 hover:bg-white/90 font-bold shadow-lg">
                                        <Link to="/knowledge/search?f=required">
                                            {t('view_all')} <ArrowRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Primary Gateways */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Master Library Gateway */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Link to="/knowledge/search" className="group">
                                <Card className="h-full border-none shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 bg-white overflow-hidden">
                                    <CardContent className="p-0 flex h-full">
                                        <div className="w-2 bg-hotel-navy group-hover:bg-hotel-gold transition-colors" />
                                        <div className="p-8 flex flex-col justify-between flex-1">
                                            <div>
                                                <div className="w-14 h-14 rounded-2xl bg-hotel-navy/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                                    <Library className="h-7 w-7 text-hotel-navy" />
                                                </div>
                                                <h3 className="text-2xl font-bold text-hotel-navy mb-3">{t('library.title')}</h3>
                                                <p className="text-gray-500 mb-6 leading-relaxed">
                                                    {t('library.description')}
                                                </p>
                                            </div>
                                            <div className="flex items-center text-hotel-navy font-bold group-hover:text-hotel-gold transition-colors">
                                                {t('library.enter')} <ArrowRight className="ml-2 h-5 w-5" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>

                            {primaryRole !== 'staff' && (
                                <Link to="/knowledge/create" className="group">
                                    <Card className="h-full border-none shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 bg-hotel-navy overflow-hidden">
                                        <CardContent className="p-0 flex h-full">
                                            <div className="w-2 bg-hotel-gold" />
                                            <div className="p-8 flex flex-col justify-between flex-1">
                                                <div className="text-white">
                                                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                                        <Plus className="h-7 w-7 text-hotel-gold" />
                                                    </div>
                                                    <h3 className="text-2xl font-bold mb-3">{t('create_article')}</h3>
                                                    <p className="text-white/60 mb-6 leading-relaxed">
                                                        Contribute to the collective knowledge. Draft new SOPs and operational guides.
                                                    </p>
                                                </div>
                                                <div className="flex items-center text-hotel-gold font-bold transition-colors">
                                                    Start Drafting <ArrowRight className="ml-2 h-5 w-5" />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            )}
                        </div>

                        {/* Recent Discoveries */}
                        <section>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-hotel-navy flex items-center gap-3">
                                    <Clock className="h-6 w-6 text-hotel-gold" />
                                    {t('recent')}
                                </h2>
                                <Link to="/knowledge/search?sort=updated" className="text-hotel-navy hover:text-hotel-gold font-semibold flex items-center text-sm">
                                    {t('view_all')} <ChevronRight className="h-4 w-4" />
                                </Link>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {featured?.map((article, idx) => (
                                    <motion.div
                                        key={article.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                    >
                                        <Link to={`/knowledge/${article.id}`}>
                                            <Card className="hover:shadow-md transition-all border-none bg-white p-4 group">
                                                <div className="flex gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:bg-hotel-navy/5 group-hover:text-hotel-navy transition-colors">
                                                        <BookOpen size={20} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <Badge variant="outline" className="mb-2 text-[10px] uppercase tracking-wider text-gray-400">
                                                            {t(`content_types.${article.content_type}`)}
                                                        </Badge>
                                                        <h4 className="font-bold text-hotel-navy line-clamp-1 group-hover:text-hotel-gold transition-colors">{article.title}</h4>
                                                        <p className="text-xs text-gray-400 mt-1">{article.department?.name}</p>
                                                    </div>
                                                </div>
                                            </Card>
                                        </Link>
                                    </motion.div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Personalized & High-Level Info */}
                    <div className="space-y-8">
                        {/* Department Hub */}
                        <Card className="border-none shadow-lg bg-white overflow-hidden">
                            <CardContent className="p-0">
                                <div className="bg-hotel-navy p-6 text-white text-center">
                                    <div className="w-16 h-16 rounded-full bg-white/10 mx-auto flex items-center justify-center mb-4">
                                        <LayoutGrid className="h-8 w-8 text-hotel-gold" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-1">{primaryDept?.name || 'Your Department'}</h3>
                                    <p className="text-white/60 text-sm">Specialized Knowledge Hub</p>
                                </div>
                                <div className="p-6 space-y-4">
                                    {deptArticles?.slice(0, 4).map(art => (
                                        <Link
                                            key={art.id}
                                            to={`/knowledge/${art.id}`}
                                            className="flex items-center justify-between group py-2 border-b border-gray-50 last:border-0"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-hotel-gold transition-colors">{art.title}</p>
                                                <p className="text-[10px] text-gray-500 mt-1">{new Date(art.updated_at).toLocaleDateString()}</p>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-hotel-gold transform group-hover:translate-x-1 transition-all" />
                                        </Link>
                                    ))}
                                    <Button asChild variant="outline" className="w-full mt-4 border-hotel-navy/20 hover:bg-hotel-navy hover:text-white transition-all">
                                        <Link to={`/knowledge/search?department=${primaryDept?.id}`}>
                                            Explore Department <ArrowRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Help / AI Assistant Card */}
                        <Card className="border-none shadow-lg bg-gradient-to-br from-hotel-navy to-blue-900 text-white overflow-hidden">
                            <CardContent className="p-8 text-center relative">
                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                    <MessageCircle size={80} />
                                </div>
                                <div className="w-14 h-14 rounded-full bg-hotel-gold/20 mx-auto flex items-center justify-center mb-6 text-hotel-gold">
                                    <Star className="h-7 w-7" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">AI Knowledge Pro</h3>
                                <p className="text-white/70 text-sm mb-6 leading-relaxed">
                                    Need quick answers? Our AI assistant can help you find protocols and SOP details instantly.
                                </p>
                                <Button className="bg-hotel-gold text-hotel-navy hover:bg-hotel-gold/90 font-bold w-full shadow-lg border-none">
                                    Ask Assistant
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Recently Viewed List */}
                        {recentlyViewed && recentlyViewed.length > 0 && (
                            <section>
                                <h3 className="text-lg font-bold text-hotel-navy mb-4 flex items-center gap-2">
                                    <Clock size={18} className="text-hotel-gold" />
                                    {t('your_recently_viewed')}
                                </h3>
                                <div className="space-y-3">
                                    {recentlyViewed.map(article => (
                                        <Link key={article.id} to={`/knowledge/${article.id}`}>
                                            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 hover:border-hotel-gold/30 transition-all">
                                                <p className="text-sm font-medium text-gray-700 truncate">{article.title}</p>
                                                <p className="text-[10px] text-gray-500 mt-1">{new Date(article.updated_at).toLocaleDateString()}</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
