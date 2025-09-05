/**
 * Motion Wrapper Components
 * Fixed motion components that properly type HTML attributes
 */
import React from 'react';
import { motion, MotionProps } from 'framer-motion';

// Base interface combining HTML attributes with Motion props
interface BaseMotionProps extends MotionProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

// Motion Div
interface MotionDivProps extends BaseMotionProps, 
  Omit<React.HTMLAttributes<HTMLDivElement>, keyof BaseMotionProps> {}

export const MotionDiv = React.forwardRef<HTMLDivElement, MotionDivProps>(
  ({ children, ...props }, ref) => {
    return (
      <motion.div ref={ref} {...props}>
        {children}
      </motion.div>
    );
  }
);
MotionDiv.displayName = 'MotionDiv';

// Motion Button
interface MotionButtonProps extends BaseMotionProps,
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseMotionProps> {}

export const MotionButton = React.forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ children, ...props }, ref) => {
    return (
      <motion.button ref={ref} {...props}>
        {children}
      </motion.button>
    );
  }
);
MotionButton.displayName = 'MotionButton';

// Motion Header
interface MotionHeaderProps extends BaseMotionProps,
  Omit<React.HTMLAttributes<HTMLElement>, keyof BaseMotionProps> {}

export const MotionHeader = React.forwardRef<HTMLElement, MotionHeaderProps>(
  ({ children, ...props }, ref) => {
    return (
      <motion.header ref={ref} {...props}>
        {children}
      </motion.header>
    );
  }
);
MotionHeader.displayName = 'MotionHeader';

// Motion Section
interface MotionSectionProps extends BaseMotionProps,
  Omit<React.HTMLAttributes<HTMLElement>, keyof BaseMotionProps> {}

export const MotionSection = React.forwardRef<HTMLElement, MotionSectionProps>(
  ({ children, ...props }, ref) => {
    return (
      <motion.section ref={ref} {...props}>
        {children}
      </motion.section>
    );
  }
);
MotionSection.displayName = 'MotionSection';

// Motion Span
interface MotionSpanProps extends BaseMotionProps,
  Omit<React.HTMLAttributes<HTMLSpanElement>, keyof BaseMotionProps> {}

export const MotionSpan = React.forwardRef<HTMLSpanElement, MotionSpanProps>(
  ({ children, ...props }, ref) => {
    return (
      <motion.span ref={ref} {...props}>
        {children}
      </motion.span>
    );
  }
);
MotionSpan.displayName = 'MotionSpan';

// Motion Form
interface MotionFormProps extends BaseMotionProps,
  Omit<React.FormHTMLAttributes<HTMLFormElement>, keyof BaseMotionProps> {}

export const MotionForm = React.forwardRef<HTMLFormElement, MotionFormProps>(
  ({ children, ...props }, ref) => {
    return (
      <motion.form ref={ref} {...props}>
        {children}
      </motion.form>
    );
  }
);
MotionForm.displayName = 'MotionForm';

// Motion Link (Anchor)
interface MotionLinkProps extends BaseMotionProps,
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseMotionProps> {}

export const MotionLink = React.forwardRef<HTMLAnchorElement, MotionLinkProps>(
  ({ children, ...props }, ref) => {
    return (
      <motion.a ref={ref} {...props}>
        {children}
      </motion.a>
    );
  }
);
MotionLink.displayName = 'MotionLink';