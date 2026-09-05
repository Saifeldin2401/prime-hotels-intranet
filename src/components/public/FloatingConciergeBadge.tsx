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
      className={`w-[150px] h-[150px] rounded-full bg-[#12161F]/90 backdrop-blur-xl border border-[#C45B2F]/40 text-white flex flex-col items-center justify-center shadow-[0_15px_40px_rgba(0,0,0,0.7),0_0_25px_rgba(196,91,47,0.15)] select-none pointer-events-auto transition-transform duration-200 ease-out hover:scale-105 active:scale-95 group ${className}`}
    >
      <div className="w-[134px] h-[134px] rounded-full border border-dashed border-[#C45B2F]/30 flex flex-col items-center justify-center p-3 text-center">
        <span className="text-2xl font-serif italic text-[#F3C99F] leading-none mb-1 group-hover:text-[#E07A5F] transition-colors">
          {number}
        </span>
        <span className="text-[7.5px] font-bold uppercase tracking-[0.25em] text-slate-300 text-center leading-tight">
          {label}
        </span>
        <div className="w-4 h-0.5 bg-[#C45B2F]/60 rounded-full mt-1.5" />
      </div>
    </div>
  );
}
