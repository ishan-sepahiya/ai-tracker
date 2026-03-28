"use client";

import { useState } from 'react';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  className?: string;
}

export default function Tooltip({ children, content, className = "" }: TooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="group relative inline-block">
      <div 
        className="cursor-help"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {children}
      </div>
      {show && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-2 glass-card text-xs text-white rounded-xl border border-[#D9D9D9]/50 shadow-2xl whitespace-nowrap z-50">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#D9D9D9]/50 -mt-1"></div>
        </div>
      )}
    </div>
  );
}
