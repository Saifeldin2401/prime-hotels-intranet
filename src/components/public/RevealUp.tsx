import React, { useEffect, useRef, useState } from 'react';

interface RevealUpProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  threshold?: number;
}

export function RevealUp({
  children,
  className = '',
  delay = 0,
  threshold = 0.15,
}: RevealUpProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (ref.current) observer.unobserve(ref.current);
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  return (
    <div
      ref={ref}
      className={`reveal-up ${isVisible ? 'is-visible' : ''} ${className}`}
      style={{
        transitionDelay: `${delay}s`,
      }}
    >
      {children}
    </div>
  );
}
