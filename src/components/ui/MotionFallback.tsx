/**
 * Temporary fallback components for framer-motion to ensure build compatibility
 * This should be replaced with proper framer-motion components in a future update
 */

import React from 'react';

interface FallbackMotionProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  initial?: any;
  animate?: any;
  exit?: any;
  whileHover?: any;
  whileTap?: any;
  transition?: any;
}

// Fallback motion div - renders as regular div
export const MotionDiv: React.FC<FallbackMotionProps & React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  onClick,
  // Ignore animation props for now
  initial,
  animate,
  exit,
  whileHover,
  whileTap,
  transition,
  ...props
}) => (
  <div className={className} onClick={onClick} {...props}>
    {children}
  </div>
);

// Fallback motion button - renders as regular button
export const MotionButton: React.FC<FallbackMotionProps & React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  children,
  className,
  onClick,
  disabled,
  // Ignore animation props for now
  initial,
  animate,
  exit,
  whileHover,
  whileTap,
  transition,
  ...props
}) => (
  <button 
    className={className} 
    onClick={onClick} 
    disabled={disabled}
    {...props}
  >
    {children}
  </button>
);

// Fallback motion span - renders as regular span
export const MotionSpan: React.FC<FallbackMotionProps & React.HTMLAttributes<HTMLSpanElement>> = ({
  children,
  className,
  onClick,
  // Ignore animation props for now
  initial,
  animate,
  exit,
  whileHover,
  whileTap,
  transition,
  ...props
}) => (
  <span className={className} onClick={onClick} {...props}>
    {children}
  </span>
);

// Fallback AnimatePresence - renders children directly
export const FallbackAnimatePresence: React.FC<{ 
  children: React.ReactNode;
  mode?: string;
}> = ({ children }) => <>{children}</>;

// Export motion object for compatibility
export const fallbackMotion = {
  div: MotionDiv,
  button: MotionButton,
  span: MotionSpan,
};