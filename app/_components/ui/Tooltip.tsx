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
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-2 bg-white text-xs text-[#111111] rounded-2xl border border-[#DFDFE2] shadow-sm whitespace-nowrap z-50">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#DFDFE2] -mt-1"></div>
        </div>
      )}
    </div>
  );
}
