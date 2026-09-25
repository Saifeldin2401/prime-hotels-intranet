import { memo, useRef, useState, useEffect, useCallback } from 'react';
import type { MotionVideoProps } from './types';
import { cn } from '@/lib/utils';

function MotionVideoComponent({
  webmSrc,
  mp4Src,
  posterSrc,
  posterFallbackSrc,
  onLoadSuccess,
  onLoadError,
  className,
}: MotionVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleVideoLoaded = useCallback(() => {
    setIsPlaying(true);
    onLoadSuccess?.();
  }, [onLoadSuccess]);

  const handleVideoError = useCallback(() => {
    setHasError(true);
    onLoadError?.();
  }, [onLoadError]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Ensure audio is permanently disabled
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;

    // Check if video is already ready
    if (video.readyState >= 3) {
      handleVideoLoaded();
    }

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          // Autoplay blocked by browser policy; stay on poster gracefully
          setIsPlaying(false);
        });
    }
  }, [handleVideoLoaded]);

  if (hasError) {
    return null;
  }

  return (
    <div className={cn('relative w-full h-full overflow-hidden bg-ds-ink', className)}>
      {/* Immediate Poster Layer for Instant LCP & Progressive Enhancement */}
      <picture className="absolute inset-0 w-full h-full">
        <source srcSet={posterSrc} type="image/webp" />
        {posterFallbackSrc && <source srcSet={posterFallbackSrc} type="image/jpeg" />}
        <img
          src={posterFallbackSrc || posterSrc}
          alt=""
          role="presentation"
          aria-hidden="true"
          className="w-full h-full object-cover object-center pointer-events-none select-none"
          loading="eager"
        />
      </picture>

      {/* HTML5 Living Hospitality Motion Video */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        onCanPlay={handleVideoLoaded}
        onLoadedData={handleVideoLoaded}
        onError={handleVideoError}
        aria-hidden="true"
        tabIndex={-1}
        className={cn(
          'absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ease-out pointer-events-none select-none',
          isPlaying ? 'opacity-100' : 'opacity-0'
        )}
      >
        <source src={webmSrc} type="video/webm" />
        <source src={mp4Src} type="video/mp4" />
      </video>
    </div>
  );
}

export const MotionVideo = memo(MotionVideoComponent);
MotionVideo.displayName = 'MotionVideo';
export default MotionVideo;
