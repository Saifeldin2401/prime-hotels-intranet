import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'

interface NavItem {
    label: string
    href: string
}

export function PublicNavbar() {
    const { t } = useTranslation('nav')
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const navItems: NavItem[] = []
    return (
        <header className="bg-hotel-navy text-white shadow-lg sticky top-0 z-50">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between h-20 px-4 lg:px-8">
                    {/* Logo with PHG Connect branding */}
                    <Link to="/" className="flex items-center gap-4">
                        <img
                            src="/prime-logo-light.png"
                            alt="Prime Hotels Group"
                            className="h-14 w-auto"
                        />
                        <div className="hidden sm:block border-l border-white/20 pl-4">
                            <div className="text-lg font-bold text-hotel-gold tracking-wide">PHG Connect</div>
                            <div className="text-xs text-white/60 tracking-wider uppercase">Official Intranet</div>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex items-center gap-8">
                        <nav className="flex items-center gap-6">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    to={item.href}
                                    className="text-white/90 hover:text-white transition-colors font-medium"
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                        <LanguageSwitcher />
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="lg:hidden flex items-center gap-4">
                        <LanguageSwitcher />
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="text-white hover:bg-white/10"
                        >
                            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </Button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="lg:hidden border-t border-white/20">
                        <nav className="px-4 py-4 space-y-2">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    to={item.href}
                                    className="block py-2 text-white/90 hover:text-white transition-colors font-medium"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                    </div>
                )}
            </div>
        </header>
    )
}

export default PublicNavbar
