import React, { useState } from 'react'
import { colors } from '@/ui/tokens/colors'
import { typography } from '@/ui/tokens/typography'
import { Button } from '@/ui/primitives/Button'
import { StatusPill } from '@/ui/primitives/StatusPill'
import { ConfirmDialog } from '@/ui/primitives/ConfirmDialog'
import { QueryState } from '@/ui/primitives/QueryState'
import { Moon, Sun, CheckCircle2, AlertTriangle, AlertCircle, Info, ShieldAlert, ArrowLeftRight } from 'lucide-react'

export default function ComponentGallery() {
  const [isDark, setIsDark] = useState(false)
  const [isRTL, setIsRTL] = useState(false)
  const [queryStateMode, setQueryStateMode] = useState<'success' | 'loading' | 'empty' | 'error' | 'forbidden' | 'offline'>('success')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const toggleTheme = () => {
    setIsDark(!isDark)
    if (!isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const toggleDirection = () => {
    const next = !isRTL
    setIsRTL(next)
    document.documentElement.setAttribute('dir', next ? 'rtl' : 'ltr')
  }

  const tokenList = [
    { name: 'Ink (Primary)', light: colors.light.ink, dark: colors.dark.ink, usage: 'Text, primary buttons, active navigation' },
    { name: 'Ink Secondary', light: colors.light.inkSecondary, dark: colors.dark.inkSecondary, usage: 'Secondary text, icons, subtitled metadata' },
    { name: 'Muted', light: colors.light.muted, dark: colors.dark.muted, usage: 'Placeholders, subtle borders, metadata' },
    { name: 'Border', light: colors.light.border, dark: colors.dark.border, usage: 'Dividers, input outlines, table borders' },
    { name: 'Background', light: colors.light.background, dark: colors.dark.background, usage: 'Application background ground' },
    { name: 'Surface', light: colors.light.surface, dark: colors.dark.surface, usage: 'Panels, tables, cards, sheet backgrounds' },
    { name: 'Brass (Accent)', light: colors.light.brass, dark: colors.dark.brass, usage: 'Focus rings, active states, key links (never large fills)' },
    { name: 'Success', light: colors.light.success, dark: colors.dark.success, usage: 'Passed, completed, valid compliance status' },
    { name: 'Warning', light: colors.light.warning, dark: colors.dark.warning, usage: 'Due soon, expiring, unverified notice' },
    { name: 'Danger', light: colors.light.danger, dark: colors.dark.danger, usage: 'Overdue, failed, destructive actions' },
    { name: 'Info', light: colors.light.info, dark: colors.dark.info, usage: 'Neutral notices, drafts, informational alerts' },
  ]

  return (
    <div className={`min-h-screen p-8 bg-[#F6F6F3] dark:bg-[#101419] text-[#15212E] dark:text-[#F0F3F7] font-sans transition-colors duration-150`}>
      <header className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#DDDBD4] dark:border-[#2C3644] mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Altus Connect Design System</h1>
          <p className="text-sm text-[#667080] dark:text-[#7D8B9B] mt-1">
            Enterprise Tokens, Typography Scale, and WCAG AA Primitives Gallery
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={toggleDirection} leftIcon={<ArrowLeftRight className="w-4 h-4" />}>
            {isRTL ? 'Switch to LTR (English)' : 'Switch to RTL (العربية)'}
          </Button>
          <Button variant="secondary" size="sm" onClick={toggleTheme} leftIcon={isDark ? <Sun className="w-4 h-4 text-[#D4AA55]" /> : <Moon className="w-4 h-4" />}>
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto space-y-12">
        {/* SECTION 1: COLOR TOKENS */}
        <section aria-labelledby="section-colors" className="space-y-4">
          <h2 id="section-colors" className="text-lg font-semibold tracking-tight">
            1. Semantic Color Tokens (WCAG AA Certified)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tokenList.map((token) => (
              <div
                key={token.name}
                className="p-4 bg-[#FFFFFF] dark:bg-[#18202A] border border-[#DDDBD4] dark:border-[#2C3644] rounded-[8px] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{token.name}</span>
                  <div
                    className="w-8 h-8 rounded-[6px] border border-black/10 shrink-0"
                    style={{ backgroundColor: isDark ? token.dark : token.light }}
                  />
                </div>
                <div className="font-mono text-xs text-[#667080] dark:text-[#7D8B9B]">
                  Light: {token.light} · Dark: {token.dark}
                </div>
                <p className="text-xs text-[#3B4754] dark:text-[#B4BFCB]">
                  {token.usage}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 2: TYPOGRAPHY SCALE */}
        <section aria-labelledby="section-typography" className="space-y-4">
          <h2 id="section-typography" className="text-lg font-semibold tracking-tight">
            2. Typography Scale (IBM Plex Sans & Arabic)
          </h2>
          <div className="p-6 bg-[#FFFFFF] dark:bg-[#18202A] border border-[#DDDBD4] dark:border-[#2C3644] rounded-[8px] space-y-6">
            <div>
              <span className="text-xs font-semibold text-[#86672C] dark:text-[#D4AA55] uppercase tracking-wider block mb-1">
                Display · 32/40 · 600
              </span>
              <p className={typography.scale.display.className}>
                Fire safety & guest service excellence
              </p>
            </div>
            <div className="border-t border-[#DDDBD4] dark:border-[#2C3644] pt-4">
              <span className="text-xs font-semibold text-[#86672C] dark:text-[#D4AA55] uppercase tracking-wider block mb-1">
                H1 · 24/32 · 600
              </span>
              <p className={typography.scale.h1.className}>
                Assigned courses and certifications
              </p>
            </div>
            <div className="border-t border-[#DDDBD4] dark:border-[#2C3644] pt-4">
              <span className="text-xs font-semibold text-[#86672C] dark:text-[#D4AA55] uppercase tracking-wider block mb-1">
                H2 · 18/26 · 600
              </span>
              <p className={typography.scale.h2.className}>
                Department compliance requirements
              </p>
            </div>
            <div className="border-t border-[#DDDBD4] dark:border-[#2C3644] pt-4">
              <span className="text-xs font-semibold text-[#86672C] dark:text-[#D4AA55] uppercase tracking-wider block mb-1">
                Body · 15/24 · 400
              </span>
              <p className={typography.scale.body.className}>
                Complete all mandatory lessons before taking the final quiz. A minimum passing score of 80% is required to issue your accredited certificate.
              </p>
            </div>
            <div className="border-t border-[#DDDBD4] dark:border-[#2C3644] pt-4">
              <span className="text-xs font-semibold text-[#86672C] dark:text-[#D4AA55] uppercase tracking-wider block mb-1">
                Label · 12/16 · 600 Caps
              </span>
              <p className={typography.scale.label.className}>
                Due Date · 2026-10-15
              </p>
            </div>
            <div className="border-t border-[#DDDBD4] dark:border-[#2C3644] pt-4">
              <span className="text-xs font-semibold text-[#86672C] dark:text-[#D4AA55] uppercase tracking-wider block mb-1">
                Data · Mono 13
              </span>
              <p className={typography.scale.data.className}>
                CERT-2026-004817 · Hash: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 3: BUTTON PRIMITIVES */}
        <section aria-labelledby="section-buttons" className="space-y-4">
          <h2 id="section-buttons" className="text-lg font-semibold tracking-tight">
            3. Button Primitives (Touch Target &gt;= 44px, Brass Focus Ring)
          </h2>
          <div className="p-6 bg-[#FFFFFF] dark:bg-[#18202A] border border-[#DDDBD4] dark:border-[#2C3644] rounded-[8px] space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary">Primary Action</Button>
              <Button variant="secondary">Secondary Action</Button>
              <Button variant="ghost">Ghost Button</Button>
              <Button variant="destructive">Destructive Action</Button>
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-[#DDDBD4] dark:border-[#2C3644]">
              <Button variant="primary" isLoading>Loading State</Button>
              <Button variant="secondary" disabled>Disabled State</Button>
              <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
                Open Confirm Dialog
              </Button>
            </div>
          </div>
        </section>

        {/* SECTION 4: STATUS PILLS */}
        <section aria-labelledby="section-pills" className="space-y-4">
          <h2 id="section-pills" className="text-lg font-semibold tracking-tight">
            4. Status Pills (Semantic States)
          </h2>
          <div className="p-6 bg-[#FFFFFF] dark:bg-[#18202A] border border-[#DDDBD4] dark:border-[#2C3644] rounded-[8px] flex flex-wrap gap-3">
            <StatusPill variant="success" label="Completed" icon={<CheckCircle2 className="w-3.5 h-3.5" />} />
            <StatusPill variant="warning" label="Due in 2 Days" icon={<AlertTriangle className="w-3.5 h-3.5" />} />
            <StatusPill variant="danger" label="Overdue" icon={<AlertCircle className="w-3.5 h-3.5" />} />
            <StatusPill variant="info" label="Draft Article" icon={<Info className="w-3.5 h-3.5" />} />
            <StatusPill variant="neutral" label="Not Started" />
          </div>
        </section>

        {/* SECTION 5: QUERY STATE SIMULATOR */}
        <section aria-labelledby="section-querystate" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 id="section-querystate" className="text-lg font-semibold tracking-tight">
              5. QueryState Wrapper (Unified View States)
            </h2>
            <div className="flex flex-wrap gap-2">
              {(['success', 'loading', 'empty', 'error', 'forbidden', 'offline'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setQueryStateMode(mode)}
                  className={`px-3 py-1.5 min-h-[44px] rounded-[6px] text-xs font-semibold uppercase tracking-wider border transition-colors ${
                    queryStateMode === mode
                      ? 'bg-[#86672C] text-white border-[#86672C]'
                      : 'bg-[#FFFFFF] dark:bg-[#18202A] border-[#DDDBD4] dark:border-[#2C3644] text-[#15212E] dark:text-[#F0F3F7]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-[#FFFFFF] dark:bg-[#18202A] border border-[#DDDBD4] dark:border-[#2C3644] rounded-[8px]">
            <QueryState
              isLoading={queryStateMode === 'loading'}
              isEmpty={queryStateMode === 'empty'}
              error={queryStateMode === 'error' ? new Error('Unable to connect to Supabase cluster.') : null}
              isForbidden={queryStateMode === 'forbidden'}
              isOffline={queryStateMode === 'offline'}
              emptyTitle="No courses enrolled"
              emptyDescription="You have not been assigned any mandatory courses yet."
              emptyAction={<Button variant="primary">Browse Catalog</Button>}
              onRetry={() => setQueryStateMode('success')}
            >
              <div className="p-6 bg-[#F6F6F3] dark:bg-[#101419] rounded-[6px] border border-[#DDDBD4] dark:border-[#2C3644]">
                <h3 className="font-semibold text-base mb-2">Live Content Rendered Successfully</h3>
                <p className="text-sm text-[#3B4754] dark:text-[#B4BFCB]">
                  All courses and lessons are loaded directly through feature hooks.
                </p>
              </div>
            </QueryState>
          </div>
        </section>
      </main>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false)
          alert('Action confirmed!')
        }}
        title="Delete Course Module"
        description="This will permanently revoke all associated assignments and certificates. This action cannot be undone."
        confirmString="DELETE"
        confirmButtonText="Permanently Delete"
      />
    </div>
  )
}
