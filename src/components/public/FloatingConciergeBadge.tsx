import React from 'react';

interface FloatingConciergeBadgeProps {
  number?: string;
  label?: string;
  className?: string;
}

export function FloatingConciergeBadge({
  number = '01',
  label = 'CONCIERGE • SELECTION',
  className = '',
}: FloatingConciergeBadgeProps) {
  return (
    <div
      className={`w-[160px] h-[160px] rounded-full bg-[#e4a4bd] text-[#262626] flex flex-col items-center justify-center shadow-2xl animate-bounce-slow select-none pointer-events-auto ${className}`}
    >
      <span className="text-3xl italic font-bold tracking-tight leading-none mb-1">
        {number}
      </span>
      <span className="text-[8px] font-black uppercase tracking-[0.3em] text-center px-4 leading-tight opacity-90">
        {label}
      </span>
    </div>
  );
}
