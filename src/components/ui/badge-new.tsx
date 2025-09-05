/**
 * Badge Component - Custom implementation to replace missing Radix UI component
 */
import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'error' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const Badge: React.FC<BadgeProps> = ({ 
  className, 
  variant = 'default', 
  size = 'md',
  children,
  ...props 
}) => {
  const baseClasses = "inline-flex items-center font-semibold rounded-full border transition-colors";
  
  const variantClasses = {
    default: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200",
    secondary: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200",
    success: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200",
    warning: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200",
    error: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200",
    outline: "bg-transparent text-gray-800 border-gray-300 dark:text-gray-200 dark:border-gray-600",
  };
  
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm", 
    lg: "px-3 py-1.5 text-base",
  };

  return (
    <span
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export { Badge };
export type { BadgeProps };