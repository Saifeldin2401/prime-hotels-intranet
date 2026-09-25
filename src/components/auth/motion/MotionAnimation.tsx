import { memo } from 'react';
import type { MotionAnimationProps } from './types';
import { cn } from '@/lib/utils';

function MotionAnimationComponent({ className }: MotionAnimationProps) {
  return (
    <div
      className={cn(
        'relative w-full h-full overflow-hidden bg-[#0d1622] flex items-center justify-center',
        className
      )}
      aria-hidden="true"
    >
      {/* Subtle luxury hospitality ambient mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(183,154,98,0.15),rgba(255,255,255,0))]" />
      <div className="absolute inset-0 bg-gradient-to-t from-ds-ink via-ds-ink/60 to-transparent" />

      {/* Architectural SVG lines & interconnected capability nodes */}
      <svg
        className="w-full h-full max-w-2xl max-h-[600px] opacity-30 pointer-events-none"
        viewBox="0 0 800 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="brassLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#b79a62" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#b79a62" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#b79a62" stopOpacity="0.2" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ambient Grid Lines */}
        <g stroke="rgba(255,255,255,0.06)" strokeWidth="1">
          <line x1="100" y1="0" x2="100" y2="600" />
          <line x1="300" y1="0" x2="300" y2="600" />
          <line x1="500" y1="0" x2="500" y2="600" />
          <line x1="700" y1="0" x2="700" y2="600" />
          <line x1="0" y1="150" x2="800" y2="150" />
          <line x1="0" y1="300" x2="800" y2="300" />
          <line x1="0" y1="450" x2="800" y2="450" />
        </g>

        {/* Flowing operational capability path */}
        <path
          d="M 120 420 C 240 420, 260 220, 400 220 C 540 220, 560 360, 680 360"
          stroke="url(#brassLineGrad)"
          strokeWidth="2"
          strokeDasharray="6 6"
          className="animate-[dash_30s_linear_infinite]"
        />

        {/* Dynamic Nodes representing Learning, Knowledge, Assessment, Certification, Performance */}
        <g filter="url(#glow)">
          <circle cx="120" cy="420" r="5" fill="#b79a62" className="animate-pulse" />
          <circle cx="260" cy="320" r="4" fill="#b79a62" opacity="0.7" />
          <circle cx="400" cy="220" r="6" fill="#b79a62" className="animate-pulse" />
          <circle cx="540" cy="290" r="4" fill="#b79a62" opacity="0.7" />
          <circle cx="680" cy="360" r="5" fill="#b79a62" className="animate-pulse" />
        </g>
      </svg>
    </div>
  );
}

export const MotionAnimation = memo(MotionAnimationComponent);
MotionAnimation.displayName = 'MotionAnimation';
export default MotionAnimation;
