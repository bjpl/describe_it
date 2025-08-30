import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageViewer from '@/components/ImageViewer/ImageViewer';
import { imageFactory } from '../../utils/test-factories';
import { performanceTestSuite, expectPerformance } from '../../utils/performance-helpers';
import { runAccessibilityTests } from '../../utils/accessibility-helpers';

// Mock next/image for testing
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => (
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    img: 'img',
    button: 'button',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

describe('ImageViewer Component', () => {
  const mockImage = imageFactory.create({
    id: 'test-image-1',
    description: 'A beautiful Spanish landscape with mountains and valleys',
    alt_description: 'Spanish mountain landscape',
    urls: {
      raw: 'https://example.com/image-raw.jpg',
      full: 'https://example.com/image-full.jpg',
      regular: 'https://example.com/image-regular.jpg',
      small: 'https://example.com/image-small.jpg',
      thumb: 'https://example.com/image-thumb.jpg',
      small_s3: 'https://example.com/image-small-s3.jpg',
    },
  });
  
  const defaultProps = {
    image: mockImage,
    isOpen: true,
    onClose: vi.fn(),
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe('Rendering', () => {
    it('should render image viewer when open', () => {
      render(<ImageViewer {...defaultProps} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('img')).toBeInTheDocument();
      expect(screen.getByText(mockImage.description)).toBeInTheDocument();
    });
    
    it('should not render when closed', () => {
      render(<ImageViewer {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    
    it('should render image with correct attributes', () => {
      render(<ImageViewer {...defaultProps} />);
      
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', mockImage.urls.regular);
      expect(image).toHaveAttribute('alt', mockImage.alt_description);
    });
    
    it('should render photographer information', () => {
      render(<ImageViewer {...defaultProps} />);
      
      expect(screen.getByText(mockImage.user.name)).toBeInTheDocument();
      expect(screen.getByText(`@${mockImage.user.username}`)).toBeInTheDocument();
    });
    
    it('should render image metadata', () => {
      render(<ImageViewer {...defaultProps} />);
      
      expect(screen.getByText(`${mockImage.width} × ${mockImage.height}`)).toBeInTheDocument();
      expect(screen.getByText(mockImage.likes)).toBeInTheDocument();
      expect(screen.getByText(mockImage.downloads)).toBeInTheDocument();
    });
  });
  
  describe('User Interactions', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      
      render(<ImageViewer {...defaultProps} onClose={onClose} />);
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    
    it('should call onClose when Escape key is pressed', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      
      render(<ImageViewer {...defaultProps} onClose={onClose} />);
      
      await user.keyboard('{Escape}');
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    
    it('should call onClose when backdrop is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      
      render(<ImageViewer {...defaultProps} onClose={onClose} />);
      
      const backdrop = screen.getByTestId('image-viewer-backdrop');
      await user.click(backdrop);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    
    it('should not close when clicking on image content', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      
      render(<ImageViewer {...defaultProps} onClose={onClose} />);
      
      const image = screen.getByRole('img');
      await user.click(image);
      
      expect(onClose).not.toHaveBeenCalled();
    });
  });
  
  describe('Image Quality Selection', () => {
    it('should allow switching between image qualities', async () => {
      const user = userEvent.setup();
      
      render(<ImageViewer {...defaultProps} />);
      
      const qualitySelect = screen.getByLabelText(/quality/i);
      await user.selectOptions(qualitySelect, 'full');
      
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', mockImage.urls.full);
    });
    
    it('should default to regular quality', () => {
      render(<ImageViewer {...defaultProps} />);
      
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', mockImage.urls.regular);
    });
    
    it('should show loading state when switching quality', async () => {
      const user = userEvent.setup();
      
      render(<ImageViewer {...defaultProps} />);
      
      const qualitySelect = screen.getByLabelText(/quality/i);
      await user.selectOptions(qualitySelect, 'full');
      
      // Should show loading state briefly
      expect(screen.getByTestId('image-loading')).toBeInTheDocument();
    });
  });
  
  describe('Download Functionality', () => {
    it('should handle image download', async () => {
      const user = userEvent.setup();
      
      // Mock URL.createObjectURL and document.createElement
      const mockCreateObjectURL = vi.fn(() => 'mock-blob-url');
      const mockClick = vi.fn();
      const mockAnchor = {
        href: '',
        download: '',
        click: mockClick,
      };
      
      global.URL.createObjectURL = mockCreateObjectURL;
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
      
      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob()),
      });
      
      render(<ImageViewer {...defaultProps} />);
      
      const downloadButton = screen.getByRole('button', { name: /download/i });
      await user.click(downloadButton);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(mockImage.urls.regular);
        expect(mockClick).toHaveBeenCalled();
      });
    });
    
    it('should handle download errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock fetch to fail
      global.fetch = vi.fn().mockRejectedValue(new Error('Download failed'));
      
      render(<ImageViewer {...defaultProps} />);
      
      const downloadButton = screen.getByRole('button', { name: /download/i });
      await user.click(downloadButton);
      
      await waitFor(() => {
        expect(screen.getByText(/download failed/i)).toBeInTheDocument();
      });
    });
  });
  
  describe('Share Functionality', () => {
    it('should open share menu when share button is clicked', async () => {
      const user = userEvent.setup();
      
      render(<ImageViewer {...defaultProps} />);
      
      const shareButton = screen.getByRole('button', { name: /share/i });
      await user.click(shareButton);
      
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
    
    it('should copy image URL to clipboard', async () => {
      const user = userEvent.setup();
      
      // Mock clipboard API
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });
      
      render(<ImageViewer {...defaultProps} />);
      
      const shareButton = screen.getByRole('button', { name: /share/i });
      await user.click(shareButton);
      
      const copyLinkButton = screen.getByRole('menuitem', { name: /copy link/i });
      await user.click(copyLinkButton);
      
      expect(mockWriteText).toHaveBeenCalledWith(mockImage.links.html);
    });
  });
  
  describe('Image Navigation', () => {
    const mockImages = [
      imageFactory.create({ id: 'image-1' }),
      imageFactory.create({ id: 'image-2' }),
      imageFactory.create({ id: 'image-3' }),
    ];
    
    it('should navigate to next image', async () => {
      const user = userEvent.setup();
      const onImageChange = vi.fn();
      
      render(
        <ImageViewer 
          {...defaultProps} 
          image={mockImages[0]}
          images={mockImages}
          currentIndex={0}
          onImageChange={onImageChange}
        />
      );
      
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      
      expect(onImageChange).toHaveBeenCalledWith(1);
    });
    
    it('should navigate to previous image', async () => {
      const user = userEvent.setup();
      const onImageChange = vi.fn();
      
      render(
        <ImageViewer 
          {...defaultProps} 
          image={mockImages[1]}
          images={mockImages}
          currentIndex={1}
          onImageChange={onImageChange}
        />
      );
      
      const prevButton = screen.getByRole('button', { name: /previous/i });
      await user.click(prevButton);
      
      expect(onImageChange).toHaveBeenCalledWith(0);
    });
    
    it('should handle keyboard navigation', async () => {
      const user = userEvent.setup();
      const onImageChange = vi.fn();
      
      render(
        <ImageViewer 
          {...defaultProps} 
          image={mockImages[1]}
          images={mockImages}
          currentIndex={1}
          onImageChange={onImageChange}
        />
      );
      
      await user.keyboard('{ArrowRight}');
      expect(onImageChange).toHaveBeenCalledWith(2);
      
      await user.keyboard('{ArrowLeft}');
      expect(onImageChange).toHaveBeenCalledWith(0);
    });
    
    it('should disable navigation at boundaries', () => {
      render(
        <ImageViewer 
          {...defaultProps} 
          image={mockImages[0]}
          images={mockImages}
          currentIndex={0}
        />
      );
      
      const prevButton = screen.getByRole('button', { name: /previous/i });
      expect(prevButton).toBeDisabled();
      
      // Test last image
      render(
        <ImageViewer 
          {...defaultProps} 
          image={mockImages[2]}
          images={mockImages}
          currentIndex={2}
        />
      );
      
      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeDisabled();
    });
  });
  
  describe('Zoom Functionality', () => {
    it('should allow zooming in and out', async () => {
      const user = userEvent.setup();
      
      render(<ImageViewer {...defaultProps} />);
      
      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
      const zoomOutButton = screen.getByRole('button', { name: /zoom out/i });
      
      await user.click(zoomInButton);
      
      const imageContainer = screen.getByTestId('image-container');
      expect(imageContainer).toHaveStyle('transform: scale(1.5)');
      
      await user.click(zoomOutButton);
      expect(imageContainer).toHaveStyle('transform: scale(1)');
    });
    
    it('should reset zoom when image changes', async () => {
      const user = userEvent.setup();
      const mockImages = [imageFactory.create(), imageFactory.create()];
      
      const { rerender } = render(
        <ImageViewer 
          {...defaultProps} 
          image={mockImages[0]}
        />
      );
      
      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
      await user.click(zoomInButton);
      
      // Change image
      rerender(
        <ImageViewer 
          {...defaultProps} 
          image={mockImages[1]}
        />
      );
      
      const imageContainer = screen.getByTestId('image-container');
      expect(imageContainer).toHaveStyle('transform: scale(1)');
    });
  });
  
  describe('Loading States', () => {
    it('should show loading state while image is loading', () => {
      render(<ImageViewer {...defaultProps} />);
      
      // Before image loads
      expect(screen.getByTestId('image-loading')).toBeInTheDocument();
    });
    
    it('should handle image load errors', async () => {
      render(<ImageViewer {...defaultProps} />);
      
      const image = screen.getByRole('img');
      
      // Simulate image load error
      fireEvent.error(image);
      
      await waitFor(() => {
        expect(screen.getByText(/failed to load image/i)).toBeInTheDocument();
      });
    });
    
    it('should show retry button on image load error', async () => {
      const user = userEvent.setup();
      
      render(<ImageViewer {...defaultProps} />);
      
      const image = screen.getByRole('img');
      fireEvent.error(image);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
      
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);
      
      // Should attempt to reload the image
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });
  
  describe('Performance', () => {
    it('should render within performance thresholds', async () => {
      const metrics = await performanceTestSuite.measureRenderTime(
        () => render(<ImageViewer {...defaultProps} />),
        5
      );
      
      expectPerformance.toBeFasterThan(metrics, 50); // Should render in < 50ms
      expectPerformance.toBeConsistent(metrics, 25); // Should be consistent
    });
    
    it('should handle large images efficiently', async () => {
      const largeImage = imageFactory.create({
        width: 8000,
        height: 6000,
        urls: {
          ...mockImage.urls,
          full: 'https://example.com/large-image.jpg',
        },
      });
      
      const metrics = await performanceTestSuite.measureRenderTime(
        () => render(<ImageViewer {...defaultProps} image={largeImage} />),
        3
      );
      
      expectPerformance.toBeFasterThan(metrics, 100); // Should still render reasonably fast
    });
  });
  
  describe('Accessibility', () => {
    it('should pass accessibility tests', async () => {
      const { passed, results } = await runAccessibilityTests(
        <ImageViewer {...defaultProps} />,
        {
          expectedFocusOrder: ['close button', 'zoom in', 'zoom out', 'download', 'share'],
        }
      );
      
      expect(passed).toBe(true);
      expect(results.ariaAttributes.passed).toBe(true);
    });
    
    it('should support screen reader navigation', async () => {
      render(<ImageViewer {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');
      
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt', mockImage.alt_description);
    });
    
    it('should trap focus within modal', async () => {
      const user = userEvent.setup();
      
      render(<ImageViewer {...defaultProps} />);
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      closeButton.focus();
      
      // Tab should cycle through modal elements only
      await user.tab();
      expect(document.activeElement).not.toBe(document.body);
      
      // Should not focus elements outside modal
      const outsideElement = document.createElement('button');
      document.body.appendChild(outsideElement);
      outsideElement.focus();
      
      // Focus should return to modal
      expect(document.activeElement).toBe(closeButton);
      
      document.body.removeChild(outsideElement);
    });
    
    it('should announce zoom level changes', async () => {
      const user = userEvent.setup();
      
      render(<ImageViewer {...defaultProps} />);
      
      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
      await user.click(zoomInButton);
      
      // Should have ARIA live region with zoom level
      expect(screen.getByRole('status')).toHaveTextContent('Zoom: 150%');
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle missing image data gracefully', () => {
      const incompleteImage = {
        ...mockImage,
        description: null,
        alt_description: null,
        user: { ...mockImage.user, name: null },
      };
      
      render(<ImageViewer {...defaultProps} image={incompleteImage} />);
      
      // Should still render without crashing
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
    
    it('should handle very long descriptions', () => {
      const longDescriptionImage = {
        ...mockImage,
        description: 'Lorem ipsum '.repeat(200), // Very long description
      };
      
      render(<ImageViewer {...defaultProps} image={longDescriptionImage} />);
      
      const description = screen.getByText(longDescriptionImage.description);
      expect(description).toBeInTheDocument();
      
      // Should be scrollable or truncated
      expect(description).toHaveClass('overflow-y-auto');
    });
    
    it('should handle rapid open/close operations', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      
      const { rerender } = render(
        <ImageViewer {...defaultProps} onClose={onClose} isOpen={true} />
      );
      
      // Rapidly toggle open/close
      for (let i = 0; i < 5; i++) {
        const closeButton = screen.getByRole('button', { name: /close/i });
        await user.click(closeButton);
        
        rerender(<ImageViewer {...defaultProps} onClose={onClose} isOpen={false} />);
        rerender(<ImageViewer {...defaultProps} onClose={onClose} isOpen={true} />);
      }
      
      // Should handle without memory leaks or crashes
      expect(onClose).toHaveBeenCalledTimes(5);
    });
  });
});
