/**
 * Framer Motion Type Fixes
 * Extends Framer Motion component types to fix TypeScript errors
 */

import { HTMLMotionProps } from 'framer-motion';

declare module 'framer-motion' {
  // Fix for motion.div, motion.button, etc. to accept all HTML attributes
  interface HTMLMotionProps<T extends keyof JSX.IntrinsicElements> 
    extends JSX.IntrinsicElements[T] {
    // Allow all standard HTML attributes
    className?: string;
    onClick?: (event: React.MouseEvent) => void;
    onSubmit?: (event: React.FormEvent) => void;
    onChange?: (event: React.ChangeEvent) => void;
    onFocus?: (event: React.FocusEvent) => void;
    onBlur?: (event: React.FocusEvent) => void;
    style?: React.CSSProperties;
    id?: string;
    'data-testid'?: string;
    'aria-label'?: string;
    'aria-labelledby'?: string;
    'aria-describedby'?: string;
    'aria-expanded'?: boolean | 'false' | 'true';
    'aria-hidden'?: boolean | 'false' | 'true';
    'aria-modal'?: boolean | 'false' | 'true';
    role?: string;
    tabIndex?: number;
    title?: string;
    type?: string;
    disabled?: boolean;
    value?: string | number;
    placeholder?: string;
    required?: boolean;
    readOnly?: boolean;
    autoComplete?: string;
    autoFocus?: boolean;
    name?: string;
    href?: string;
    target?: string;
    rel?: string;
  }
}

// Additional type fixes for specific motion components
declare global {
  namespace JSX {
    interface IntrinsicElements {
      // Ensure motion components work with all HTML attributes
      'motion.div': HTMLMotionProps<'div'>;
      'motion.button': HTMLMotionProps<'button'>;
      'motion.header': HTMLMotionProps<'header'>;
      'motion.section': HTMLMotionProps<'section'>;
      'motion.article': HTMLMotionProps<'article'>;
      'motion.aside': HTMLMotionProps<'aside'>;
      'motion.nav': HTMLMotionProps<'nav'>;
      'motion.main': HTMLMotionProps<'main'>;
      'motion.footer': HTMLMotionProps<'footer'>;
      'motion.span': HTMLMotionProps<'span'>;
      'motion.p': HTMLMotionProps<'p'>;
      'motion.h1': HTMLMotionProps<'h1'>;
      'motion.h2': HTMLMotionProps<'h2'>;
      'motion.h3': HTMLMotionProps<'h3'>;
      'motion.form': HTMLMotionProps<'form'>;
      'motion.input': HTMLMotionProps<'input'>;
      'motion.textarea': HTMLMotionProps<'textarea'>;
      'motion.select': HTMLMotionProps<'select'>;
      'motion.a': HTMLMotionProps<'a'>;
      'motion.img': HTMLMotionProps<'img'>;
      'motion.ul': HTMLMotionProps<'ul'>;
      'motion.ol': HTMLMotionProps<'ol'>;
      'motion.li': HTMLMotionProps<'li'>;
    }
  }
}