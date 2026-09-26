import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, FileCheck2, ClipboardCheck, Award, Sparkles } from 'lucide-react';
import type { OperationalOverlayProps } from './types';
import { cn } from '@/lib/utils';

interface Pillar {
  id: string;
  labelKey: string;
  defaultEn: string;
  defaultAr: string;
  icon: React.ElementType;
}

const PILLARS: Pillar[] = [
  { id: 'learning', labelKey: 'pillars.learning', defaultEn: 'Learning', defaultAr: 'Ø§Ù„ØªØ¹Ù„Ù…', icon: BookOpen },
  { id: 'knowledge', labelKey: 'pillars.knowledge', defaultEn: 'Knowledge', defaultAr: 'Ø§Ù„Ù…Ø¹Ø±ÙØ©', icon: FileCheck2 },
  { id: 'assessment', labelKey: 'pillars.assessment', defaultEn: 'Assessment', defaultAr: 'Ø§Ù„ØªÙ‚ÙŠÙŠÙ…', icon: ClipboardCheck },
  { id: 'certification', labelKey: 'pillars.certification', defaultEn: 'Certification', defaultAr: 'Ø§Ù„Ø´Ù‡Ø§Ø¯Ø§Øª', icon: Award },
  { id: 'excellence', labelKey: 'pillars.excellence', defaultEn: 'Excellence', defaultAr: 'Ø§Ù„ØªÙ…ÙŠØ²', icon: Sparkles },
];

function OperationalOverlayComponent({ isRTL = false, className }: OperationalOverlayProps) {
  const { t } = useTranslation('auth');

  return (
    <div
      className={cn(
        'w-full max-w-lg select-none pointer-events-none py-1',
        className
      )}
      aria-hidden="true"
    >
      {/* Restrained horizontal connected progression */}
      <div className="relative flex items-center justify-between">
        {/* Baseline accurately centered through the 32px (h-8) circle centers */}
        <div className="absolute inset-x-6 top-4 -translate-y-1/2 h-[1px] bg-ds-border" />

        {/* 5 Subtle capability indicators */}
        {PILLARS.map((pillar, idx) => {
          const Icon = pillar.icon;
          const isFinal = idx === PILLARS.length - 1;
          const label = isRTL
            ? t(pillar.labelKey, { defaultValue: pillar.defaultAr })
            : t(pillar.labelKey, { defaultValue: pillar.defaultEn });

          return (
            <div key={pillar.id} className="relative z-10 flex flex-col items-center group">
              <div
                className={cn(
                  'w-8 h-8 rounded-full border bg-white flex items-center justify-center transition-all duration-300 shadow-xs',
                  isFinal
                    ? 'border-ds-brass/70 text-ds-brass bg-ds-brass/10 ring-2 ring-ds-brass/15'
                    : 'border-ds-border text-ds-muted'
                )}
              >
                <Icon className={cn('w-3.5 h-3.5', isFinal ? 'text-ds-brass' : 'text-ds-muted')} />
              </div>

              <span
                className={cn(
                  'mt-1.5 text-[11px] font-medium tracking-wide whitespace-nowrap',
                  isFinal ? 'text-ds-brass font-semibold' : 'text-ds-muted'
                )}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const OperationalOverlay = memo(OperationalOverlayComponent);
OperationalOverlay.displayName = 'OperationalOverlay';
export default OperationalOverlay;