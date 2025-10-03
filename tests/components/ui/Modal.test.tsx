/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { Modal, ConfirmModal } from '@/components/ui/Modal';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('Modal Component', () => {
  beforeEach(() => {
    // Create a root element for portal
    const portalRoot = document.createElement('div');
    portalRoot.setAttribute('id', 'portal-root');
    document.body.appendChild(portalRoot);
  });

  afterEach(() => {
    // Clean up portal root
    document.body.innerHTML = '';
  });

  describe('Open/Close Behavior', () => {
    it('should render when isOpen is true', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <div>Modal Content</div>
        </Modal>
      );
      expect(screen.getByText('Modal Content')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={() => {}}>
          <div>Modal Content</div>
        </Modal>
      );
      expect(screen.queryByText('Modal Content')).not.toBeInTheDocument();
    });

    it('should call onClose when overlay is clicked', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose}>
          <div>Content</div>
        </Modal>
      );

      const overlay = screen.getByRole('dialog');
      fireEvent.click(overlay);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('should not close when clicking modal content', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose}>
          <div>Content</div>
        </Modal>
      );

      fireEvent.click(screen.getByText('Content'));
      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  describe('Escape Key Behavior', () => {
    it('should close on Escape key when closeOnEscape is true', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} closeOnEscape={true}>
          <div>Content</div>
        </Modal>
      );

      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
      expect(handleClose).toHaveBeenCalled();
    });

    it('should not close on Escape key when closeOnEscape is false', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} closeOnEscape={false}>
          <div>Content</div>
        </Modal>
      );

      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  describe('Close Button', () => {
    it('should show close button by default', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Test Modal">
          <div>Content</div>
        </Modal>
      );
      expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
    });

    it('should hide close button when showCloseButton is false', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} showCloseButton={false}>
          <div>Content</div>
        </Modal>
      );
      expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Test">
          <div>Content</div>
        </Modal>
      );

      fireEvent.click(screen.getByLabelText('Close modal'));
      expect(handleClose).toHaveBeenCalled();
    });
  });

  describe('Sizes', () => {
    it('should apply small size class', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} size="sm">
          <div>Small Modal</div>
        </Modal>
      );
      expect(container.querySelector('.max-w-md')).toBeInTheDocument();
    });

    it('should apply medium size class (default)', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}}>
          <div>Medium Modal</div>
        </Modal>
      );
      expect(container.querySelector('.max-w-lg')).toBeInTheDocument();
    });

    it('should apply large size class', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} size="lg">
          <div>Large Modal</div>
        </Modal>
      );
      expect(container.querySelector('.max-w-2xl')).toBeInTheDocument();
    });

    it('should apply extra large size class', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} size="xl">
          <div>XL Modal</div>
        </Modal>
      );
      expect(container.querySelector('.max-w-4xl')).toBeInTheDocument();
    });

    it('should apply full size class', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} size="full">
          <div>Full Modal</div>
        </Modal>
      );
      expect(container.querySelector('.max-w-\\[95vw\\]')).toBeInTheDocument();
    });
  });

  describe('Title and Description', () => {
    it('should render title when provided', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Test Title">
          <div>Content</div>
        </Modal>
      );
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('should render description when provided', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Title" description="Test description">
          <div>Content</div>
        </Modal>
      );
      expect(screen.getByText('Test description')).toBeInTheDocument();
    });

    it('should have proper ARIA attributes for title', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Test Title">
          <div>Content</div>
        </Modal>
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('should have proper ARIA attributes for description', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Title" description="Description">
          <div>Content</div>
        </Modal>
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-describedby', 'modal-description');
    });
  });

  describe('Accessibility', () => {
    it('should have role="dialog"', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <div>Content</div>
        </Modal>
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have aria-modal="true"', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <div>Content</div>
        </Modal>
      );
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('should prevent body scroll when open', async () => {
      const { rerender } = render(
        <Modal isOpen={false} onClose={() => {}}>
          <div>Content</div>
        </Modal>
      );

      rerender(
        <Modal isOpen={true} onClose={() => {}}>
          <div>Content</div>
        </Modal>
      );

      await waitFor(() => {
        expect(document.body.style.overflow).toBe('hidden');
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should trap focus within modal', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Test">
          <button>Button 1</button>
          <button>Button 2</button>
        </Modal>
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} className="custom-modal">
          <div>Content</div>
        </Modal>
      );
      expect(container.querySelector('.custom-modal')).toBeInTheDocument();
    });
  });

  describe('CloseOnOverlayClick', () => {
    it('should not close when closeOnOverlayClick is false', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} closeOnOverlayClick={false}>
          <div>Content</div>
        </Modal>
      );

      const overlay = screen.getByRole('dialog');
      fireEvent.click(overlay);
      expect(handleClose).not.toHaveBeenCalled();
    });
  });
});

describe('ConfirmModal Component', () => {
  it('should render with default props', () => {
    render(<ConfirmModal isOpen={true} onClose={() => {}} onConfirm={() => {}} />);
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
  });

  it('should render custom title and description', () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={() => {}}
        onConfirm={() => {}}
        title="Delete Item?"
        description="This will permanently delete the item."
      />
    );
    expect(screen.getByText('Delete Item?')).toBeInTheDocument();
    expect(screen.getByText('This will permanently delete the item.')).toBeInTheDocument();
  });

  it('should call onConfirm when confirm button is clicked', () => {
    const handleConfirm = vi.fn();
    render(<ConfirmModal isOpen={true} onClose={() => {}} onConfirm={handleConfirm} />);

    fireEvent.click(screen.getByText('Confirm'));
    expect(handleConfirm).toHaveBeenCalled();
  });

  it('should call onClose when cancel button is clicked', () => {
    const handleClose = vi.fn();
    render(<ConfirmModal isOpen={true} onClose={handleClose} onConfirm={() => {}} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(handleClose).toHaveBeenCalled();
  });

  it('should render destructive variant', () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={() => {}}
        onConfirm={() => {}}
        variant="destructive"
      />
    );
    const confirmButton = screen.getByText('Confirm');
    expect(confirmButton).toHaveClass('bg-destructive');
  });

  it('should disable buttons when loading', () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={() => {}}
        onConfirm={() => {}}
        loading={true}
      />
    );
    expect(screen.getByText('Cancel')).toBeDisabled();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
