"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  title?: string;
  description?: string;
  preventScroll?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  children,
  className,
  size = "md",
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  title,
  description,
  preventScroll = true,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  // Size variants
  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-[95vw] max-h-[95vh]",
  };

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose, closeOnEscape]);

  // Handle focus management
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousFocus.current = document.activeElement as HTMLElement;
      
      // Focus the modal
      setTimeout(() => {
        if (modalRef.current) {
          const focusableElement = modalRef.current.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          ) as HTMLElement;
          
          if (focusableElement) {
            focusableElement.focus();
          } else {
            modalRef.current.focus();
          }
        }
      }, 100);
    } else {
      // Restore focus when modal closes
      if (previousFocus.current) {
        previousFocus.current.focus();
      }
    }
  }, [isOpen]);

  // Handle body scroll
  useEffect(() => {
    if (!preventScroll) return;

    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen, preventScroll]);

  // Handle focus trap
  const handleTabKey = (event: React.KeyboardEvent) => {
    if (event.key !== "Tab" || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement?.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement?.focus();
    }
  };

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  if (typeof window === "undefined") return null;

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={handleOverlayClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? "modal-title" : undefined}
          aria-describedby={description ? "modal-description" : undefined}
        >
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "relative w-full bg-background rounded-lg shadow-xl border",
              sizeClasses[size],
              "max-h-[90vh] overflow-auto",
              className
            )}
            onKeyDown={handleTabKey}
            tabIndex={-1}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex-1">
                  {title && (
                    <h2 id="modal-title" className="text-lg font-semibold">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p id="modal-description" className="text-sm text-muted-foreground mt-1">
                      {description}
                    </p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="ml-4 p-2 hover:bg-accent rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                    aria-label="Close modal"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className={cn("p-6", (title || showCloseButton) && "pt-0")}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// Modal components for composition
export interface ModalHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalHeader({ children, className }: ModalHeaderProps) {
  return (
    <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}>
      {children}
    </div>
  );
}

export interface ModalTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalTitle({ children, className }: ModalTitleProps) {
  return (
    <h3 className={cn("text-lg font-semibold leading-none tracking-tight", className)}>
      {children}
    </h3>
  );
}

export interface ModalDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalDescription({ children, className }: ModalDescriptionProps) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {children}
    </p>
  );
}

export interface ModalContentProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalContent({ children, className }: ModalContentProps) {
  return (
    <div className={cn("py-4", className)}>
      {children}
    </div>
  );
}

export interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 space-y-2 sm:space-y-0 border-t pt-6", className)}>
      {children}
    </div>
  );
}

// Confirmation modal utility
export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  loading = false,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" title={title} description={description}>
      <ModalFooter>
        <button
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50",
            variant === "destructive"
              ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {loading ? "Loading..." : confirmText}
        </button>
      </ModalFooter>
    </Modal>
  );
}

export default Modal;
