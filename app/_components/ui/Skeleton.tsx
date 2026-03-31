"use client";

interface SkeletonProps {
  className?: string;
  variant?: 'default' | 'card' | 'line' | 'circle';
  size?: 'sm' | 'md' | 'lg';
}

const variants = {
  default: "h-4 rounded-xl",
  card: "h-48 rounded-3xl",
  line: "h-6 rounded-lg",
  circle: "w-12 h-12 rounded-full"
} as const;

const sizes = {
  sm: "h-3 w-24",
  md: "h-4 w-48",
  lg: "h-6 w-72"
} as const;

function cn(...inputs: (string | null | undefined)[]) {
  return inputs.filter(Boolean).join(' ');
}

export default function Skeleton({ 
  className = "", 
  variant = 'default' as const, 
  size = 'md' as const 
}: SkeletonProps) {
const baseClasses = "bg-[#F4F4F4]/50 animate-pulse border border-[#DFDFE2]/50 rounded-2xl";

  return (
    <div 
      className={cn(
        baseClasses, 
        variants[variant], 
        sizes[size], 
        className
      )}
    />
  );
}

// Usage: <Skeleton variant="card" size="lg" className="w-full" />

