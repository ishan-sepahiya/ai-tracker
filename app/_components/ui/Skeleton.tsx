"use client";

import { cn } from "@/lib/utils"; // Assume shadcn or similar; fallback to simple

interface SkeletonProps {
  className?: string;
  variant?: 'default' | 'card' | 'line' | 'circle';
  size?: 'sm' | 'md' | 'lg';
}

export default function Skeleton({ 
  className = "", 
  variant = 'default', 
  size = 'md' 
}: SkeletonProps) {
  const baseClasses = "glass-card animate-pulse border-[#D9D9D9]/20 bg-[#284B63]/20";
  
  const variantClasses = {
    default: "h-4 rounded-xl",
    card: "h-48 rounded-3xl",
    line: "h-6 rounded-lg",
    circle: "w-12 h-12 rounded-full"
  }[variant];

  const sizeClasses = {
    sm: "h-3 w-24",
    md: "h-4 w-48",
    lg: "h-6 w-72"
  }[size];

  return (
    <div 
      className={cn(baseClasses, variantClasses, sizeClasses, className)}
    />
  );
}

// Usage: <Skeleton variant="card" size="lg" />

