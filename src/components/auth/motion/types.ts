export type VisualType = 'auto' | 'lottie' | 'video' | 'animation' | 'static';

export interface AuthMotionVisualProps {
  /**
   * Mode of visual presentation:
   * - 'auto': uses the education & learning Lottie animation by default with static fallback
   * - 'lottie': renders the vector Lottie learning animation
   * - 'video': renders HTML5 video background
   * - 'animation': renders vector SVG kinetic motion
   * - 'static': renders high-fidelity photographic/brand fallback
   */
  visualType?: VisualType;
  /** Primary WebM source URL (if video mode selected) */
  webmSrc?: string;
  /** Fallback MP4 H.264 source URL (if video mode selected) */
  mp4Src?: string;
  /** Primary modern WebP poster URL (<250KB) */
  posterSrc?: string;
  /** Legacy fallback JPG poster URL */
  posterFallbackSrc?: string;
  /** Optional headline for the editorial left panel */
  headline?: string;
  /** Optional supporting statement for the left panel */
  subline?: string;
  /** Small badge or platform identifier text */
  badgeText?: string;
  /** Whether to show the subtle 5-step operational progression overlay */
  showOverlayPillars?: boolean;
  /** RTL layout flag */
  isRTL?: boolean;
  /** Additional CSS class names for the container */
  className?: string;
}

export interface MotionVideoProps {
  webmSrc: string;
  mp4Src: string;
  posterSrc: string;
  posterFallbackSrc?: string;
  onLoadSuccess?: () => void;
  onLoadError?: () => void;
  className?: string;
}

export interface MotionAnimationProps {
  className?: string;
  isRTL?: boolean;
}

export interface StaticFallbackProps {
  posterSrc?: string;
  posterFallbackSrc?: string;
  className?: string;
  isRTL?: boolean;
}

export interface OperationalOverlayProps {
  isRTL?: boolean;
  className?: string;
}
