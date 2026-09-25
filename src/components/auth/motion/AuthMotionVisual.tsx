import { memo, useState, useEffect } from 'react';
import type { AuthMotionVisualProps } from './types';
import { MotionLottie } from './MotionLottie';
import { MotionVideo } from './MotionVideo';
import { MotionAnimation } from './MotionAnimation';
import { StaticFallback } from './StaticFallback';
import { OperationalOverlay } from './OperationalOverlay';
import { cn } from '@/lib/utils';
import { ShieldCheck } from 'lucide-react';

function AuthMotionVisualComponent({
  visualType = 'auto',
  webmSrc = '/media/auth/altus-auth-motion.webm',
  mp4Src = '/media/auth/altus-auth-motion.mp4',
  posterSrc = '/media/auth/altus-auth-motion-poster.webp',
  posterFallbackSrc = '/media/auth/altus-auth-motion-poster.jpg',
  headline = 'Learning that elevates hospitality excellence.',
  subline = 'Training, knowledge, assessment and certification for world-class hospitality teams.',
  badgeText = 'Hospitality Learning & Certification',
  showOverlayPillars = true,
  isRTL = false,
  className,
}: AuthMotionVisualProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [videoErrored, setVideoErrored] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia) {
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(motionQuery.matches);

      const motionListener = (e: MediaQueryListEvent) => {
        setPrefersReducedMotion(e.matches);
      };
      motionQuery.addEventListener('change', motionListener);

      // Detect mobile viewport (under 768px, mobile devices prioritize lightweight rendering)
      const mobileQuery = window.matchMedia('(max-width: 767px)');
      setIsMobile(mobileQuery.matches);

      const mobileListener = (e: MediaQueryListEvent) => {
        setIsMobile(e.matches);
      };
      mobileQuery.addEventListener('change', mobileListener);

      return () => {
        motionQuery.removeEventListener('change', motionListener);
        mobileQuery.removeEventListener('change', mobileListener);
      };
    }
  }, []);

  // Determine which visual engine to mount
  // User explicitly prefers education & learning Lottie animation:
  const shouldUseLottie = visualType === 'lottie' || (visualType === 'auto' && !videoErrored);
  const shouldUseVideo = visualType === 'video' && !videoErrored && !isMobile;
  const shouldUseSvg = visualType === 'animation';
  const shouldUseStatic = visualType === 'static' || (prefersReducedMotion && !shouldUseLottie);

  return (
    <div
      className={cn(
        'relative w-full h-full max-h-screen flex flex-col justify-between overflow-hidden bg-white text-ds-ink p-6 lg:p-8 xl:p-10 select-none',
        className
      )}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* â”€â”€ TOP PLATFORM IDENTIFIER â”€â”€ */}
      <div className="relative z-10 flex items-center justify-between w-full shrink-0">
        <div className="flex items-center gap-3">
          <img
            src="/altus-emblem-icon.png"
            alt="Altus Connect"
            className="h-9 w-9 object-contain rounded-lg shadow-xs"
          />
          <div>
            <span className="block text-base sm:text-lg font-semibold tracking-tight text-ds-ink leading-none">
              Altus Connect
            </span>
            <span className="block text-[10px] font-medium tracking-widest uppercase text-ds-brass mt-1">
              Hospitality Learning Platform
            </span>
          </div>
        </div>

        {/* Small restrained indicator */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-ds-border bg-slate-50/80 backdrop-blur-sm text-[11px] text-ds-muted shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium">Enterprise Ready</span>
        </div>
      </div>

      {/* â”€â”€ CENTER EDITORIAL POSITIONING & LEARNING LOTTIE VISUAL â”€â”€ */}
      <div className="relative z-10 max-w-lg mx-auto w-full my-auto flex-1 min-h-0 flex flex-col justify-center py-2 space-y-3">
        <div className="space-y-1.5 shrink-0">
          {badgeText && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-ds-brass/30 bg-ds-brass/10 text-ds-brass text-xs font-medium backdrop-blur-xs mb-1">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-ds-brass" />
              <span>{badgeText}</span>
            </div>
          )}

          {/* Restrained Editorial Headline */}
          <h1 className="text-2xl sm:text-3xl xl:text-[2rem] font-semibold text-ds-ink tracking-tight leading-tight">
            {headline}
          </h1>

          {/* Supporting Line */}
          <p className="text-ds-muted text-xs sm:text-sm leading-relaxed max-w-md">
            {subline}
          </p>
        </div>

        {/* â”€â”€ PRIMARY LEARNING MOTION VISUAL (Lottie - Fit to Viewport) â”€â”€ */}
        <div className="relative w-full flex-1 min-h-0 max-h-[260px] sm:max-h-[300px] xl:max-h-[330px] mx-auto my-1 flex items-center justify-center pointer-events-none">
          {shouldUseLottie ? (
            <MotionLottie isPaused={prefersReducedMotion} />
          ) : shouldUseVideo ? (
            <div className="w-full h-full rounded-2xl overflow-hidden border border-ds-border shadow-md">
              <MotionVideo
                webmSrc={webmSrc}
                mp4Src={mp4Src}
                posterSrc={posterSrc}
                posterFallbackSrc={posterFallbackSrc}
                onLoadError={() => setVideoErrored(true)}
              />
            </div>
          ) : shouldUseSvg ? (
            <MotionAnimation isRTL={isRTL} />
          ) : (
            <StaticFallback
              posterSrc={posterSrc}
              posterFallbackSrc={posterFallbackSrc}
              isRTL={isRTL}
            />
          )}
        </div>

        {/* Subtle Horizontal Progression Overlay */}
        {showOverlayPillars && (
          <div className="pt-1 shrink-0">
            <OperationalOverlay isRTL={isRTL} />
          </div>
        )}
      </div>

      {/* Ambient background gradients and luxury warmth for white canvas */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_0%,rgba(183,154,98,0.06),transparent)] pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_100%,rgba(248,250,252,0.9),transparent)] pointer-events-none -z-10" />
    </div>
  );
}

export const AuthMotionVisual = memo(AuthMotionVisualComponent);
AuthMotionVisual.displayName = 'AuthMotionVisual';
export default AuthMotionVisual;