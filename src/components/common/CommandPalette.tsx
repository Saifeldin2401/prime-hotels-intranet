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
  BookOpen,
  Briefcase,
  CalendarDays,
  CheckSquare,
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
  const { t } = useTranslation(['common', 'nav'])
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  
  const debouncedQuery = useDebounce(query, 300)
  const { results, isLoading, hasResults } = useSearch(debouncedQuery, { limit: 12 })

  const runCommand = (command: () => void) => {
    onOpenChange(false)
    command()
    setQuery('')
  }

  const getIcon = (type: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      document: <FileText className="me-2 h-4 w-4" />,
      user: <User className="me-2 h-4 w-4" />,
      training: <GraduationCap className="me-2 h-4 w-4" />,
      announcement: <Megaphone className="me-2 h-4 w-4" />,
      sop: <BookOpen className="me-2 h-4 w-4" />,
      task: <CheckSquare className="me-2 h-4 w-4" />,
      ticket: <Wrench className="me-2 h-4 w-4" />,
      referral: <Briefcase className="me-2 h-4 w-4" />,
      page: <LayoutDashboard className="me-2 h-4 w-4" />,
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
        placeholder={t('search.command_palette_placeholder', 'Type a command or search...')} 
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-hotel-gold mb-2" />
              <p className="text-sm text-gray-500">{t('loading', 'Searching...')}</p>
            </div>
          ) : (
            t('search.no_results', 'No results found.')
          )}
        </CommandEmpty>

        {/* Quick Actions - always show when no query */}
        {!debouncedQuery && (
          <>
            <CommandGroup heading={t('search.common_actions', 'Common Actions')}>
              <CommandItem onSelect={() => runCommand(() => navigate('/hr/leave/request'))}>
                <CalendarDays className="me-2 h-4 w-4" />
                <span>Request Leave</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate('/hr/payslips'))}>
                <FileText className="me-2 h-4 w-4" />
                <span>View Payslip</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate('/operations/maintenance/new'))}>
                <Wrench className="me-2 h-4 w-4" />
                <span>Submit Maintenance Ticket</span>
              </CommandItem>
            </CommandGroup>
            
            <CommandSeparator />
            
            <CommandGroup heading={t('search.navigation', 'Navigation')}>
              <CommandItem onSelect={() => runCommand(() => navigate('/profile'))}>
                <User className="me-2 h-4 w-4" />
                <span>My Profile</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate('/settings'))}>
                <Settings className="me-2 h-4 w-4" />
                <span>Settings</span>
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
