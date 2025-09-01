'use client';

import { memo, useCallback, useEffect } from 'react';
import { HelpContent } from './HelpContent';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal = memo<InfoModalProps>(function InfoModal({
  isOpen,
  onClose
}) {
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Keyboard shortcuts for modal
  useKeyboardShortcuts([
    {
      key: 'Escape',
      action: onClose,
      description: 'Close help modal'
    }
  ], { enabled: isOpen });

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleOverlayClick}
    >
      <HelpContent onClose={onClose} />
    </div>
  );
});

InfoModal.displayName = 'InfoModal';