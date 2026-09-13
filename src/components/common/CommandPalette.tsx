import { useDebounce } from '@/hooks/useDebounce'
import { useSearch } from '@/hooks/useSearch'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Award,
  BookOpen,
  Briefcase,
  Compass,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  Megaphone,
  Settings,
  User,
  Wrench
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const { t, i18n } = useTranslation(['common', 'nav'])
  const isRTL = i18n.language === 'ar' || document.documentElement.dir === 'rtl'
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  
  const debouncedQuery = useDebounce(query, 300)
  const { results, isLoading, hasResults } = useSearch(debouncedQuery, { limit: 12 })

  const runCommand = (command: () => void) => {
    onOpenChange(false)
    setQuery('')
    setTimeout(() => {
      command()
    }, 10)
  }

  const getIcon = (type: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      document: <FileText className="me-2 h-4 w-4" />,
      user: <User className="me-2 h-4 w-4" />,
      training: <GraduationCap className="me-2 h-4 w-4" />,
      announcement: <Megaphone className="me-2 h-4 w-4" />,
      sop: <BookOpen className="me-2 h-4 w-4" />,
      page: <LayoutDashboard className="me-2 h-4 w-4" />,
      certificate: <Award className="me-2 h-4 w-4" />,
      course: <Compass className="me-2 h-4 w-4" />,
    }
    return iconMap[type] || <FileText className="me-2 h-4 w-4" />
  }

  // Group dynamic results
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = []
    acc[result.type].push(result)
    return acc
  }, {} as Record<string, typeof results>)

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder={isRTL ? 'ابحث في دورات ومقررات وإجراءات ألتوس...' : 'Search ALTUS courses, modules, SOPs, certificates...'} 
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500 mb-2" />
              <p className="text-sm text-gray-500">{isRTL ? 'جاري البحث في منظومة ألتوس...' : 'Searching ALTUS ecosystem...'}</p>
            </div>
          ) : (
            isRTL ? 'لا توجد نتائج مطابقة.' : 'No results found.'
          )}
        </CommandEmpty>

        {/* Quick Actions - always show when no query */}
        {!debouncedQuery && (
          <>
            <CommandGroup heading={isRTL ? 'إجراءات التعلم السريعة' : 'Learning Actions'}>
              <CommandItem
                onSelect={() => runCommand(() => navigate('/courses'))}
                onClick={() => runCommand(() => navigate('/courses'))}
                className="cursor-pointer"
              >
                <Compass className="me-2 h-4 w-4 text-amber-500" />
                <span>{isRTL ? 'دليل ومكتبة الدورات التدريبية' : 'Explore Course Catalog'}</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => navigate('/learning/my'))}
                onClick={() => runCommand(() => navigate('/learning/my'))}
                className="cursor-pointer"
              >
                <BookOpen className="me-2 h-4 w-4 text-amber-500" />
                <span>{isRTL ? 'مساري التعليمي ومقرراتي' : 'My Learning Curriculum'}</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => navigate('/training/certificates'))}
                onClick={() => runCommand(() => navigate('/training/certificates'))}
                className="cursor-pointer"
              >
                <Award className="me-2 h-4 w-4 text-amber-500" />
                <span>{isRTL ? 'الشهادات والاعتمادات الرسمية' : 'My Certificates & Accreditations'}</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => navigate('/knowledge'))}
                onClick={() => runCommand(() => navigate('/knowledge'))}
                className="cursor-pointer"
              >
                <FileText className="me-2 h-4 w-4 text-amber-500" />
                <span>{isRTL ? 'دليل المعايير والإجراءات القياسية (SOPs)' : 'Hospitality Standards & SOPs'}</span>
              </CommandItem>
            </CommandGroup>
            
            <CommandSeparator />
            
            <CommandGroup heading={isRTL ? 'التنقل المباشر' : 'Navigation'}>
              <CommandItem
                onSelect={() => runCommand(() => navigate('/profile'))}
                onClick={() => runCommand(() => navigate('/profile'))}
                className="cursor-pointer"
              >
                <User className="me-2 h-4 w-4 text-slate-400" />
                <span>{isRTL ? 'الملف المهني' : 'My Profile'}</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => navigate('/training/paths'))}
                onClick={() => runCommand(() => navigate('/training/paths'))}
                className="cursor-pointer"
              >
                <GraduationCap className="me-2 h-4 w-4 text-slate-400" />
                <span>{isRTL ? 'المسارات التخصصية' : 'Learning Paths'}</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => navigate('/settings'))}
                onClick={() => runCommand(() => navigate('/settings'))}
                className="cursor-pointer"
              >
                <Settings className="me-2 h-4 w-4 text-slate-400" />
                <span>{isRTL ? 'إعدادات الحساب' : 'Settings'}</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}

        {/* Dynamic Results */}
        {debouncedQuery && hasResults && (
          Object.entries(groupedResults).map(([type, items]) => (
            <CommandGroup key={type} heading={type.charAt(0).toUpperCase() + type.slice(1)}>
              {items.map((result) => (
                <CommandItem 
                  key={result.id} 
                  value={result.title}
                  onSelect={() => runCommand(() => navigate(result.url))}
                  onClick={() => runCommand(() => navigate(result.url))}
                  className="cursor-pointer"
                >
                  {getIcon(result.type)}
                  <span>{result.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))
        )}
      </CommandList>
    </CommandDialog>
  )
}
