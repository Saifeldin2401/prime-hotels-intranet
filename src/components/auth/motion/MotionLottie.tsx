import { memo } from 'react';
import { useLottie } from 'lottie-react';
import learningAnimationData from '@/assets/lottie/altus-learning.json';
import { cn } from '@/lib/utils';

export interface MotionLottieProps {
  className?: string;
  isPaused?: boolean;
}

function MotionLottieComponent({ className, isPaused = false }: MotionLottieProps) {
  const options = {
    animationData: learningAnimationData,
    loop: !isPaused,
    autoplay: !isPaused,
  };

  const style = {
    width: '100%',
    height: '100%',
    maxWidth: '420px',
    maxHeight: '320px',
  };

  const { View } = useLottie(options, style);

  return (
    <div
      className={cn(
        'relative w-full h-full max-h-full flex flex-col items-center justify-center p-1 sm:p-2',
        className
      )}
      aria-hidden="true"
    >
      {/* Subtle warm ambient glow tailored for white background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_75%_at_50%_50%,rgba(183,154,98,0.08),transparent)] pointer-events-none" />
      
      {/* Scalable Vector Lottie Container */}
      <div className="relative z-10 w-full h-full max-h-full flex items-center justify-center drop-shadow-xs">
        {View}
      </div>
    </div>
  );
}

export const MotionLottie = memo(MotionLottieComponent);
MotionLottie.displayName = 'MotionLottie';
export default MotionLottie;
