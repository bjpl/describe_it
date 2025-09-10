"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

export interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
  className?: string;
  contentClassName?: string;
  disabled?: boolean;
  trigger?: "hover" | "click" | "focus";
  offset?: number;
}

export function Tooltip({
  children,
  content,
  position = "top",
  delay = 200,
  className,
  contentClassName,
  disabled = false,
  trigger = "hover",
  offset = 8,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [actualPosition, setActualPosition] = useState(position);
  
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = 0;
    let y = 0;
    let finalPosition = position;

    // Calculate initial position
    switch (position) {
      case "top":
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        y = triggerRect.top - tooltipRect.height - offset;
        break;
      case "bottom":
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        y = triggerRect.bottom + offset;
        break;
      case "left":
        x = triggerRect.left - tooltipRect.width - offset;
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        break;
      case "right":
        x = triggerRect.right + offset;
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        break;
    }

    // Adjust for viewport boundaries
    if (x < 8) {
      if (position === "left") {
        finalPosition = "right";
        x = triggerRect.right + offset;
      } else {
        x = 8;
      }
    } else if (x + tooltipRect.width > viewportWidth - 8) {
      if (position === "right") {
        finalPosition = "left";
        x = triggerRect.left - tooltipRect.width - offset;
      } else {
        x = viewportWidth - tooltipRect.width - 8;
      }
    }

    if (y < 8) {
      if (position === "top") {
        finalPosition = "bottom";
        y = triggerRect.bottom + offset;
      } else {
        y = 8;
      }
    } else if (y + tooltipRect.height > viewportHeight - 8) {
      if (position === "bottom") {
        finalPosition = "top";
        y = triggerRect.top - tooltipRect.height - offset;
      } else {
        y = viewportHeight - tooltipRect.height - 8;
      }
    }

    setTooltipPosition({ x, y });
    setActualPosition(finalPosition);
  };

  const showTooltip = () => {
    if (disabled) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const toggleTooltip = () => {
    if (isVisible) {
      hideTooltip();
    } else {
      showTooltip();
    }
  };

  useEffect(() => {
    if (isVisible) {
      // Small delay to ensure tooltip is rendered before calculating position
      setTimeout(calculatePosition, 0);
      
      // Recalculate on window resize
      window.addEventListener("resize", calculatePosition);
      window.addEventListener("scroll", calculatePosition);
      
      return () => {
        window.removeEventListener("resize", calculatePosition);
        window.removeEventListener("scroll", calculatePosition);
      };
    }
  }, [isVisible]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape" && isVisible) {
      hideTooltip();
    }
  };

  const getArrowClasses = () => {
    const baseClasses = "absolute w-2 h-2 bg-popover border transform rotate-45";
    
    switch (actualPosition) {
      case "top":
        return `${baseClasses} -bottom-1 left-1/2 -translate-x-1/2 border-t-0 border-l-0`;
      case "bottom":
        return `${baseClasses} -top-1 left-1/2 -translate-x-1/2 border-b-0 border-r-0`;
      case "left":
        return `${baseClasses} -right-1 top-1/2 -translate-y-1/2 border-l-0 border-b-0`;
      case "right":
        return `${baseClasses} -left-1 top-1/2 -translate-y-1/2 border-r-0 border-t-0`;
      default:
        return baseClasses;
    }
  };

  const triggerProps = {
    onMouseEnter: trigger === "hover" ? showTooltip : undefined,
    onMouseLeave: trigger === "hover" ? hideTooltip : undefined,
    onFocus: trigger === "focus" ? showTooltip : undefined,
    onBlur: trigger === "focus" ? hideTooltip : undefined,
    onClick: trigger === "click" ? toggleTooltip : undefined,
    onKeyDown: handleKeyDown,
  };

  if (typeof window === "undefined") {
    return <div className={className}>{children}</div>;
  }

  return (
    <>
      <div ref={triggerRef} className={className} {...triggerProps}>
        {children}
      </div>
      
      {createPortal(
        <AnimatePresence>
          {isVisible && (
            <motion.div
              ref={tooltipRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "fixed z-50 max-w-xs px-3 py-2 text-sm bg-popover text-popover-foreground rounded-md border shadow-lg",
                "pointer-events-none", // Prevent tooltip from interfering with mouse events
                contentClassName
              )}
              style={{
                left: tooltipPosition.x,
                top: tooltipPosition.y,
              }}
              role="tooltip"
            >
              {content}
              <div className={getArrowClasses()} />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

// Popover component for more complex content
export interface PopoverProps {
  children: React.ReactNode;
  content: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
  contentClassName?: string;
  trigger?: "hover" | "click" | "focus" | "manual";
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;
  offset?: number;
}

export function Popover({
  children,
  content,
  isOpen: controlledOpen,
  onOpenChange,
  position = "bottom",
  className,
  contentClassName,
  trigger = "click",
  closeOnClickOutside = true,
  closeOnEscape = true,
  offset = 8,
}: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  
  const setIsOpen = (open: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(open);
    }
    onOpenChange?.(open);
  };

  const triggerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [actualPosition, setActualPosition] = useState(position);

  const calculatePosition = () => {
    if (!triggerRef.current || !contentRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const contentRect = contentRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = 0;
    let y = 0;
    let finalPosition = position;

    switch (position) {
      case "top":
        x = triggerRect.left + triggerRect.width / 2 - contentRect.width / 2;
        y = triggerRect.top - contentRect.height - offset;
        break;
      case "bottom":
        x = triggerRect.left + triggerRect.width / 2 - contentRect.width / 2;
        y = triggerRect.bottom + offset;
        break;
      case "left":
        x = triggerRect.left - contentRect.width - offset;
        y = triggerRect.top + triggerRect.height / 2 - contentRect.height / 2;
        break;
      case "right":
        x = triggerRect.right + offset;
        y = triggerRect.top + triggerRect.height / 2 - contentRect.height / 2;
        break;
    }

    // Adjust for viewport boundaries
    if (x < 8) {
      if (position === "left") {
        finalPosition = "right";
        x = triggerRect.right + offset;
      } else {
        x = 8;
      }
    } else if (x + contentRect.width > viewportWidth - 8) {
      if (position === "right") {
        finalPosition = "left";
        x = triggerRect.left - contentRect.width - offset;
      } else {
        x = viewportWidth - contentRect.width - 8;
      }
    }

    if (y < 8) {
      if (position === "top") {
        finalPosition = "bottom";
        y = triggerRect.bottom + offset;
      } else {
        y = 8;
      }
    } else if (y + contentRect.height > viewportHeight - 8) {
      if (position === "bottom") {
        finalPosition = "top";
        y = triggerRect.top - contentRect.height - offset;
      } else {
        y = viewportHeight - contentRect.height - 8;
      }
    }

    setPopoverPosition({ x, y });
    setActualPosition(finalPosition);
  };

  // Handle click outside
  useEffect(() => {
    if (!closeOnClickOutside || !isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current &&
        contentRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        !contentRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, closeOnClickOutside]);

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, closeOnEscape]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(calculatePosition, 0);
      
      window.addEventListener("resize", calculatePosition);
      window.addEventListener("scroll", calculatePosition);
      
      return () => {
        window.removeEventListener("resize", calculatePosition);
        window.removeEventListener("scroll", calculatePosition);
      };
    }
  }, [isOpen]);

  const toggleOpen = () => setIsOpen(!isOpen);
  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  const triggerProps = {
    onMouseEnter: trigger === "hover" ? handleOpen : undefined,
    onMouseLeave: trigger === "hover" ? handleClose : undefined,
    onFocus: trigger === "focus" ? handleOpen : undefined,
    onBlur: trigger === "focus" ? handleClose : undefined,
    onClick: trigger === "click" ? toggleOpen : undefined,
  };

  const getArrowClasses = () => {
    const baseClasses = "absolute w-3 h-3 bg-popover border transform rotate-45";
    
    switch (actualPosition) {
      case "top":
        return `${baseClasses} -bottom-1.5 left-1/2 -translate-x-1/2 border-t-0 border-l-0`;
      case "bottom":
        return `${baseClasses} -top-1.5 left-1/2 -translate-x-1/2 border-b-0 border-r-0`;
      case "left":
        return `${baseClasses} -right-1.5 top-1/2 -translate-y-1/2 border-l-0 border-b-0`;
      case "right":
        return `${baseClasses} -left-1.5 top-1/2 -translate-y-1/2 border-r-0 border-t-0`;
      default:
        return baseClasses;
    }
  };

  if (typeof window === "undefined") {
    return <div className={className}>{children}</div>;
  }

  return (
    <>
      <div ref={triggerRef} className={className} {...triggerProps}>
        {children}
      </div>
      
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={contentRef}
              initial={{ opacity: 0, scale: 0.95, y: actualPosition === "top" ? 10 : -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: actualPosition === "top" ? 10 : -10 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "fixed z-50 bg-popover text-popover-foreground rounded-md border shadow-lg",
                contentClassName
              )}
              style={{
                left: popoverPosition.x,
                top: popoverPosition.y,
              }}
              role="dialog"
              aria-modal="false"
            >
              {content}
              <div className={getArrowClasses()} />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

export default Tooltip;
