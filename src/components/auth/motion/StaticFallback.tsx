import { memo, useState } from 'react';
import type { StaticFallbackProps } from './types';
import { cn } from '@/lib/utils';

function StaticFallbackComponent({
  posterSrc = '/media/auth/altus-auth-motion-poster.webp',
  posterFallbackSrc = '/media/auth/altus-auth-motion-poster.jpg',
  className,
}: StaticFallbackProps) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className={cn('relative w-full h-full overflow-hidden bg-white', className)}>
      {!imgFailed ? (
        <picture className="absolute inset-0 w-full h-full">
          <source srcSet={posterSrc} type="image/webp" />
          {posterFallbackSrc && <source srcSet={posterFallbackSrc} type="image/jpeg" />}
          <img
            src={posterFallbackSrc || posterSrc}
            alt=""
            role="presentation"
            aria-hidden="true"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover object-center pointer-events-none select-none transition-transform duration-1000 ease-out"
            loading="eager"
          />
        </picture>
      ) : (
        /* Neutral Altus Connect Visual Fallback if all external imagery fails */
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 p-8 text-center border border-ds-border">
          <div className="w-20 h-20 rounded-2xl bg-ds-brass/10 border border-ds-brass/30 flex items-center justify-center mb-6 shadow-xs">
            <img
              src="/altus-emblem-icon.png"
              alt="Altus Connect"
              className="w-12 h-12 object-contain"
            />
          </div>
          <span className="text-xl font-semibold tracking-tight text-ds-ink">
            Altus Connect
          </span>
          <span className="text-xs uppercase tracking-widest text-ds-brass mt-1 font-medium">
            Hospitality Learning Platform
          </span>
        </div>
      )}
    </div>
  );
}

export const StaticFallback = memo(StaticFallbackComponent);
StaticFallback.displayName = 'StaticFallback';
export default StaticFallback;
