import { AIAvatar } from '@/components/ai/AIAvatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import * as React from 'react'
import { useTranslation } from 'react-i18next'

interface AltusCopilotTriggerProps {
  onClick: () => void
  className?: string
}

export function AltusCopilotTrigger({ onClick, className }: AltusCopilotTriggerProps) {
  const { i18n } = useTranslation()
  const isArabic = i18n.language === 'ar' || i18n.dir() === 'rtl'

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.7, opacity: 0, y: 12 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className={cn('fixed bottom-5 end-5 z-40 select-none', className)}
          >
            <motion.button
              type="button"
              onClick={onClick}
              whileHover={{ scale: 1.08, y: -2 }}
              whileTap={{ scale: 0.92 }}
              className="cursor-pointer focus:outline-none p-0 border-0 bg-transparent"
              aria-label="Open Personal AI Assistant"
            >
              <AIAvatar size="lg" />
            </motion.button>
          </motion.div>
        </TooltipTrigger>

        <TooltipContent
          side={isArabic ? 'right' : 'left'}
          sideOffset={12}
          className="px-3 py-1.5 rounded-xl bg-slate-900/95 text-white border border-slate-800 backdrop-blur-md shadow-xl text-xs font-semibold flex items-center gap-2"
        >
          <span className="text-slate-100">
            {isArabic ? 'المساعد الشخصي الذكي' : 'Personal AI Assistant'}
          </span>
          <kbd className="px-1.5 py-0.5 bg-white/10 text-slate-300 rounded border border-white/15 text-[10px] font-mono">
            ⌘K
          </kbd>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
