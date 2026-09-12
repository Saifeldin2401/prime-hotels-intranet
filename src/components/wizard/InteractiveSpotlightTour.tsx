import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { useWizard } from '@/hooks/useWizard'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Check, 
  ArrowUpRight 
} from 'lucide-react'

interface SpotlightRect {
  top: number
  left: number
  width: number
  height: number
}

export const InteractiveSpotlightTour: React.FC = () => {
  const {
    isTourActive,
    activeTourStepIndex,
    tourSteps,
    nextTourStep,
    previousTourStep,
    skipTour,
    finishTour,
    blueprint,
    isSimulating,
    simulatedRole
  } = useWizard()

  const { t, i18n } = useTranslation('wizard')
  const navigate = useNavigate()
  const location = useLocation()
  const isRtl = i18n.language === 'ar'

  const [rect, setRect] = useState<SpotlightRect | null>(null)
  const [isWaitingForElement, setIsWaitingForElement] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  const currentStep = useMemo(() => {
    if (!tourSteps || activeTourStepIndex < 0 || activeTourStepIndex >= tourSteps.length) {
      return null
    }
    return tourSteps[activeTourStepIndex]
  }, [tourSteps, activeTourStepIndex])

  // Resilient translation helper
  const tKey = useCallback((key?: string, fallback?: string, options?: Record<string, unknown>) => {
    if (!key) return fallback || ''
    const val = t(key, options)
    if (val && val !== key) return val
    if (key.startsWith('wizard.')) {
      const stripped = key.substring(7)
      const strippedVal = t(stripped, options)
      if (strippedVal && strippedVal !== stripped) return strippedVal
    }
    return fallback || key
  }, [t])

  // Navigate to step's route if needed and locate the target element
  useEffect(() => {
    if (!isTourActive || !currentStep) {
      setRect(null)
      return
    }

    // 1. If step is on a different route, navigate there
    if (currentStep.route && location.pathname !== currentStep.route) {
      navigate(currentStep.route)
    }

    let isMounted = true
    let attempts = 0
    const maxAttempts = 25 // 2.5 seconds max waiting

    setIsWaitingForElement(true)

    const findTarget = () => {
      if (!isMounted) return
      const el = document.querySelector(currentStep.targetSelector)

      if (el) {
        const clientRect = el.getBoundingClientRect()
        // If element has geometry (is visible)
        if (clientRect.width > 0 && clientRect.height > 0) {
          const padding = currentStep.spotlightPadding || 6
          const newRect: SpotlightRect = {
            top: Math.max(0, clientRect.top - padding),
            left: Math.max(0, clientRect.left - padding),
            width: clientRect.width + padding * 2,
            height: clientRect.height + padding * 2
          }
          setRect(newRect)
          setIsWaitingForElement(false)

          // Smooth scroll to target if outside or near viewport edge
          const inView = 
            clientRect.top >= 50 &&
            clientRect.bottom <= (window.innerHeight - 50) &&
            clientRect.left >= 0 &&
            clientRect.right <= window.innerWidth

          if (!inView) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
          }
          return
        }
      }

      attempts++
      if (attempts < maxAttempts) {
        setTimeout(findTarget, 100)
      } else {
        // Fallback: If element not found, show centered floating card
        if (isMounted) {
          setIsWaitingForElement(false)
          setRect(null)
        }
      }
    }

    findTarget()

    // Recalculate on window resize or scroll
    const updatePosition = () => {
      if (!isMounted || !currentStep) return
      const el = document.querySelector(currentStep.targetSelector)
      if (el) {
        const clientRect = el.getBoundingClientRect()
        if (clientRect.width > 0 && clientRect.height > 0) {
          const padding = currentStep.spotlightPadding || 6
          setRect({
            top: Math.max(0, clientRect.top - padding),
            left: Math.max(0, clientRect.left - padding),
            width: clientRect.width + padding * 2,
            height: clientRect.height + padding * 2
          })
        }
      }
    }

    window.addEventListener('resize', updatePosition, { passive: true })
    window.addEventListener('scroll', updatePosition, { passive: true })

    return () => {
      isMounted = false
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition)
    }
  }, [isTourActive, currentStep, location.pathname, navigate])

  // Keyboard navigation
  useEffect(() => {
    if (!isTourActive) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        skipTour()
      } else if (e.key === 'ArrowRight' && !isRtl) {
        nextTourStep()
      } else if (e.key === 'ArrowLeft' && isRtl) {
        nextTourStep()
      } else if (e.key === 'ArrowLeft' && !isRtl) {
        previousTourStep()
      } else if (e.key === 'ArrowRight' && isRtl) {
        previousTourStep()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isTourActive, nextTourStep, previousTourStep, skipTour, isRtl])

  if (!isTourActive || !currentStep) {
    return null
  }

  const isFirstStep = activeTourStepIndex === 0
  const isLastStep = activeTourStepIndex === (tourSteps.length - 1)
  const totalSteps = tourSteps.length

  // Calculate Popover Coordinate
  const popoverStyle: React.CSSProperties = (() => {
    const defaultWidth = 380
    const margin = 16

    // Fallback: If no spotlight rect, center on screen
    if (!rect) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: defaultWidth,
        maxWidth: 'calc(100vw - 32px)',
        zIndex: 9995
      }
    }

    const viewportW = window.innerWidth
    const viewportH = window.innerHeight

    let placement = currentStep.placement || 'right'

    // Smart placement flipping if overflowing
    if (placement === 'right' && (rect.left + rect.width + defaultWidth + margin > viewportW)) {
      placement = rect.left > defaultWidth + margin ? 'left' : 'bottom'
    } else if (placement === 'left' && (rect.left - defaultWidth - margin < 0)) {
      placement = (viewportW - (rect.left + rect.width)) > defaultWidth + margin ? 'right' : 'bottom'
    }

    if (placement === 'bottom' && (rect.top + rect.height + 260 > viewportH)) {
      placement = 'top'
    }

    let top = 0
    let left = 0

    if (placement === 'right') {
      left = rect.left + rect.width + margin
      top = Math.max(margin, Math.min(rect.top - 20, viewportH - 320))
    } else if (placement === 'left') {
      left = Math.max(margin, rect.left - defaultWidth - margin)
      top = Math.max(margin, Math.min(rect.top - 20, viewportH - 320))
    } else if (placement === 'top') {
      top = Math.max(margin, rect.top - 240)
      left = Math.max(margin, Math.min(rect.left + (rect.width / 2) - (defaultWidth / 2), viewportW - defaultWidth - margin))
    } else {
      // Bottom
      top = Math.min(viewportH - 300, rect.top + rect.height + margin)
      left = Math.max(margin, Math.min(rect.left + (rect.width / 2) - (defaultWidth / 2), viewportW - defaultWidth - margin))
    }

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${defaultWidth}px`,
      maxWidth: 'calc(100vw - 32px)',
      zIndex: 9995
    }
  })()

  return createPortal(
    <div className="fixed inset-0 z-[9990] overflow-hidden pointer-events-none select-none">
      {/* SVG Spotlight Mask */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="interactive-spotlight-mask">
            {/* White covers entire screen */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black cutouts the highlighted element */}
            {rect && (
              <rect
                x={rect.left}
                y={rect.top}
                width={rect.width}
                height={rect.height}
                rx={12}
                fill="black"
              />
            )}
          </mask>
        </defs>
        {/* Dimming backdrop */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(5, 11, 20, 0.72)"
          mask="url(#interactive-spotlight-mask)"
          className="pointer-events-auto cursor-default"
        />
      </svg>

      {/* Golden Glowing Focus Ring around the target */}
      {rect && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="fixed pointer-events-none z-[9992] rounded-xl border-2 border-primary shadow-[0_0_25px_rgba(217,163,75,0.4)]"
          style={{
            top: `${rect.top}px`,
            left: `${rect.left}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`
          }}
        >
          {/* Animated beacon pulse on the corner */}
          <span className="absolute -top-1.5 -end-1.5 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-primary" />
          </span>
        </motion.div>
      )}

      {/* Floating Popover Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.id}
          ref={popoverRef}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          style={popoverStyle}
          className="pointer-events-auto bg-card border border-primary/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col p-5 backdrop-blur-xl space-y-4"
        >
          {/* Simulation Header Banner if testing */}
          {isSimulating && (
            <div className="bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center justify-between">
              <span>{t('simulation.banner', 'Preview Mode: Simulating role')} <strong>{simulatedRole}</strong></span>
            </div>
          )}

          {/* Top Bar: Role badge, step counter, close button */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary font-semibold text-[11px] px-2.5 py-0.5">
                <Sparkles className="h-3 w-3 me-1 inline" />
                {blueprint.roleName}
              </Badge>
              {currentStep.categoryKey && (
                <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                  {tKey(currentStep.categoryKey)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-muted-foreground font-mono">
                {activeTourStepIndex + 1} / {totalSteps}
              </span>
              <button
                onClick={skipTour}
                className="h-6 w-6 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors ms-1"
                title={t('actions.skip_all', 'Skip Tour')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Step Progress Bar */}
          <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300 rounded-full"
              style={{ width: `${Math.round(((activeTourStepIndex + 1) / totalSteps) * 100)}%` }}
            />
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <h4 className="text-base font-bold text-foreground leading-snug">
              {tKey(currentStep.titleKey)}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {tKey(currentStep.descriptionKey)}
            </p>
          </div>

          {/* Waiting indicator if element was not immediately resolved */}
          {isWaitingForElement && (
            <div className="text-[11px] text-primary/80 italic animate-pulse">
              {t('tour.locating_feature', 'Locating feature on screen...')}
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-2 flex items-center justify-between gap-2 border-t border-border/70">
            <div>
              {!isFirstStep ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={previousTourStep}
                  className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
                >
                  {isRtl ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                  {t('actions.previous', 'Previous')}
                </Button>
              ) : (
                <button
                  onClick={skipTour}
                  className="text-[11px] text-muted-foreground hover:text-foreground hover:underline transition-colors px-1"
                >
                  {t('actions.skip_all', 'Skip Tour')}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isLastStep ? (
                <Button
                  size="sm"
                  onClick={finishTour}
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
                >
                  <Check className="h-3.5 w-3.5" />
                  {t('actions.complete_onboarding', 'Finish Walkthrough')}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={nextTourStep}
                  className="h-8 text-xs gap-1.5 shadow-sm"
                >
                  {t('actions.next', 'Next Feature')}
                  {isRtl ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body
  )
}
