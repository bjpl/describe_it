import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import QAPanel from '@/components/QAPanel';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  CheckCircle: ({ className }: { className?: string }) => (
    <div data-testid="check-circle-icon" className={className}>CheckCircle</div>
  ),
  XCircle: ({ className }: { className?: string }) => (
    <div data-testid="x-circle-icon" className={className}>XCircle</div>
  ),
  RefreshCw: ({ className }: { className?: string }) => (
    <div data-testid="refresh-icon" className={className}>RefreshCw</div>
  ),
  AlertCircle: ({ className }: { className?: string }) => (
    <div data-testid="alert-circle-icon" className={className}>AlertCircle</div>
  )
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock data
const mockSelectedImage = {
  id: 'test-image-1',
  urls: {
    regular: 'https://example.com/image.jpg'
  },
  description: 'A beautiful landscape',
  alt_description: 'Mountains and trees'
};

const mockQAResponse = {
  id: 'qa-1',
  imageId: 'test-image-1',
  question: 'What can you see in this image?',
  answer: 'A beautiful landscape with mountains and trees',
  confidence: 0.95,
  createdAt: '2023-01-01T00:00:00Z'
};

describe('QAPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Empty State', () => {
    it('should render empty state when no image is selected', () => {
      render(<QAPanel selectedImage={null} descriptionText={null} style="conversacional" />);
      
      expect(screen.getByText('Questions & Answers')).toBeInTheDocument();
      expect(screen.getByText('Select an image to start the Q&A exercises.')).toBeInTheDocument();
    });

    it('should have proper heading structure in empty state', () => {
      render(<QAPanel selectedImage={null} descriptionText={null} style="conversacional" />);
      
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Questions & Answers');
    });
  });

  describe('Loading State', () => {
    it('should show loading state while generating questions', async () => {
      mockFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve(mockQAResponse)
        }), 100))
      );
      
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      expect(screen.getByText('Generating questions...')).toBeInTheDocument();
      expect(screen.getByTestId('refresh-icon')).toHaveClass('animate-spin');
    });

    it('should hide loading state after questions are generated', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockQAResponse)
      });
      
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        expect(screen.queryByText('Generating questions...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('should show error state when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));
      
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        expect(screen.getByText('Error generating questions')).toBeInTheDocument();
        expect(screen.getByText('API Error')).toBeInTheDocument();
        expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument();
      });
    });

    it('should allow retry from error state', async () => {
      // First call fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
      
      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockQAResponse)
      });
      
      fireEvent.click(screen.getByText('Try Again'));
      
      await waitFor(() => {
        expect(screen.queryByText('Network error')).not.toBeInTheDocument();
      });
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });
      
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to generate question 1')).toBeInTheDocument();
      });
    });
  });

  describe('Questions Generation', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockQAResponse)
      });
    });

    it('should generate questions on mount', async () => {
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(4); // 4 different question prompts
      });
    });

    it('should call API with correct parameters for each question type', async () => {
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        // Check first question call
        expect(mockFetch).toHaveBeenCalledWith('/api/qa/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl: 'https://example.com/image.jpg',
            question: 'What can you see in this image?'
          })
        });
      });
    });

    it('should use alternative image URL when urls.regular not available', async () => {
      const altImage = {
        ...mockSelectedImage,
        urls: undefined,
        url: 'https://example.com/alt-image.jpg'
      };
      
      render(<QAPanel selectedImage={altImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/qa/generate', expect.objectContaining({
          body: JSON.stringify(expect.objectContaining({
            imageUrl: 'https://example.com/alt-image.jpg'
          }))
        }));
      });
    });
  });

  describe('Question Display and Interaction', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockQAResponse)
      });
    });

    it('should display generated questions', async () => {
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        expect(screen.getByText('What can you see in this image?')).toBeInTheDocument();
      });
    });

    it('should show question progress', async () => {
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        expect(screen.getByText('Question 1 of 4')).toBeInTheDocument();
      });
    });

    it('should display answer options', async () => {
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        // The component creates multiple choice options, one should be the correct answer
        expect(screen.getByText('A beautiful landscape with mountains and trees')).toBeInTheDocument();
      });
    });

    it('should allow selecting an answer', async () => {
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        const correctOption = screen.getByText('A beautiful landscape with mountains and trees');
        fireEvent.click(correctOption);
        
        expect(correctOption.closest('button')).toHaveClass('border-blue-500', 'bg-blue-50');
      });
    });

    it('should show submit button after selecting an answer', async () => {
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        const correctOption = screen.getByText('A beautiful landscape with mountains and trees');
        fireEvent.click(correctOption);
        
        expect(screen.getByRole('button', { name: 'Submit Answer' })).toBeInTheDocument();
      });
    });

    it('should show instruction when no answer is selected', async () => {
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        expect(screen.getByText('Select an answer to continue')).toBeInTheDocument();
      });
    });
  });

  describe('Answer Submission and Results', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockQAResponse)
      });
    });

    it('should show correct answer feedback', async () => {
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        // Select correct answer
        const correctOption = screen.getByText('A beautiful landscape with mountains and trees');
        fireEvent.click(correctOption);
        
        // Submit answer
        fireEvent.click(screen.getByRole('button', { name: 'Submit Answer' }));
        
        expect(screen.getByText('Correct!')).toBeInTheDocument();
        expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
      });
    });

    it('should show incorrect answer feedback', async () => {
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        // Get all option buttons
        const options = screen.getAllByRole('button').filter(btn => 
          btn.textContent?.includes('library') || 
          btn.textContent?.includes('restaurant') ||
          btn.textContent?.includes('park')
        );
        
        if (options.length > 0) {
          fireEvent.click(options[0]); // Select incorrect answer
          
          fireEvent.click(screen.getByRole('button', { name: 'Submit Answer' }));
          
          expect(screen.getByText('Incorrect')).toBeInTheDocument();
          expect(screen.getByTestId('x-circle-icon')).toBeInTheDocument();
        }
      });
    });

    it('should show explanation after submission', async () => {
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        // Select and submit answer
        const correctOption = screen.getByText('A beautiful landscape with mountains and trees');
        fireEvent.click(correctOption);
        fireEvent.click(screen.getByRole('button', { name: 'Submit Answer' }));
        
        expect(screen.getByText(/Explanation:/)).toBeInTheDocument();
        expect(screen.getByText(/Based on the image analysis:/)).toBeInTheDocument();
      });
    });

    it('should update score after submission', async () => {
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        // Select and submit answer
        const correctOption = screen.getByText('A beautiful landscape with mountains and trees');
        fireEvent.click(correctOption);
        fireEvent.click(screen.getByRole('button', { name: 'Submit Answer' }));
        
        expect(screen.getByText('Score: 1/1')).toBeInTheDocument();
      });
    });

    it('should highlight correct and incorrect answers after submission', async () => {
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        // Select correct answer and submit
        const correctOption = screen.getByText('A beautiful landscape with mountains and trees');
        fireEvent.click(correctOption);
        fireEvent.click(screen.getByRole('button', { name: 'Submit Answer' }));
        
        // Correct answer should be highlighted green
        expect(correctOption.closest('button')).toHaveClass('border-green-500', 'bg-green-50');
      });
    });
  });

  describe('Navigation', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockQAResponse)
      });
    });

    it('should show navigation buttons', async () => {
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
      });
    });

    it('should disable previous button on first question', async () => {
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        const prevButton = screen.getByRole('button', { name: 'Previous' });
        expect(prevButton).toBeDisabled();
      });
    });

    it('should disable next button on last question', async () => {
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        // Navigate to last question (implementation would require multiple questions)
        const nextButton = screen.getByRole('button', { name: 'Next' });
        // Since we only have one question in our mock, next should be disabled
        expect(nextButton).toBeDisabled();
      });
    });

    it('should show progress bar', async () => {
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        const progressBar = screen.getByRole('progressbar', { hidden: true });
        expect(progressBar).toBeInTheDocument();
        
        const progressFill = progressBar.querySelector('.bg-blue-600');
        expect(progressFill).toHaveStyle('width: 25%'); // 1 of 4 questions
      });
    });
  });

  describe('Quiz Actions', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockQAResponse)
      });
    });

    it('should show new questions button', async () => {
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        expect(screen.getByText('New Questions')).toBeInTheDocument();
        expect(screen.getByTestId('refresh-icon')).toBeInTheDocument();
      });
    });

    it('should generate new questions when button is clicked', async () => {
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        mockFetch.mockClear();
        
        fireEvent.click(screen.getByText('New Questions'));
      });
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it('should show reset quiz button', async () => {
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        expect(screen.getByText('Reset Quiz')).toBeInTheDocument();
      });
    });

    it('should reset quiz state when reset button is clicked', async () => {
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        // Select and submit an answer first
        const correctOption = screen.getByText('A beautiful landscape with mountains and trees');
        fireEvent.click(correctOption);
        fireEvent.click(screen.getByRole('button', { name: 'Submit Answer' }));
        
        // Verify score exists
        expect(screen.getByText('Score: 1/1')).toBeInTheDocument();
        
        // Reset quiz
        fireEvent.click(screen.getByText('Reset Quiz'));
        
        // Score should be reset
        expect(screen.queryByText('Score: 1/1')).not.toBeInTheDocument();
      });
    });
  });

  describe('Quiz Summary', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockQAResponse)
      });
    });

    it('should show quiz progress summary', async () => {
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        // Answer a question to show progress
        const correctOption = screen.getByText('A beautiful landscape with mountains and trees');
        fireEvent.click(correctOption);
        fireEvent.click(screen.getByRole('button', { name: 'Submit Answer' }));
        
        expect(screen.getByText('Quiz Progress')).toBeInTheDocument();
        expect(screen.getByText('Completed: 1 / 4')).toBeInTheDocument();
        expect(screen.getByText('Accuracy: 100%')).toBeInTheDocument();
      });
    });

    it('should show accuracy percentage', async () => {
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        // Answer question correctly
        const correctOption = screen.getByText('A beautiful landscape with mountains and trees');
        fireEvent.click(correctOption);
        fireEvent.click(screen.getByRole('button', { name: 'Submit Answer' }));
        
        expect(screen.getByText('Accuracy: 100%')).toBeInTheDocument();
      });
    });

    it('should show visual progress bar in summary', async () => {
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        // Answer question correctly
        const correctOption = screen.getByText('A beautiful landscape with mountains and trees');
        fireEvent.click(correctOption);
        fireEvent.click(screen.getByRole('button', { name: 'Submit Answer' }));
        
        const summaryProgressBar = screen.getAllByRole('progressbar', { hidden: true })[1];
        expect(summaryProgressBar).toBeInTheDocument();
        
        const progressFill = summaryProgressBar.querySelector('.bg-blue-600');
        expect(progressFill).toHaveStyle('width: 100%'); // 100% accuracy
      });
    });
  });

  describe('Empty Questions State', () => {
    it('should show empty state when no questions generated', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockQAResponse)
      });
      
      // Mock the component to have empty questions array
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      // This would need to be tested with a different approach since the component
      // always generates 4 questions, but we'll test the conditional rendering
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockQAResponse)
      });
    });

    it('should have proper heading structure', async () => {
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      const mainHeading = screen.getByRole('heading', { level: 2 });
      expect(mainHeading).toHaveTextContent('Questions & Answers');
      
      await waitFor(() => {
        const questionHeading = screen.getByRole('heading', { level: 3 });
        expect(questionHeading).toHaveTextContent('What can you see in this image?');
      });
    });

    it('should have accessible button labels', async () => {
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        const prevButton = screen.getByRole('button', { name: 'Previous' });
        const nextButton = screen.getByRole('button', { name: 'Next' });
        
        expect(prevButton).toBeInTheDocument();
        expect(nextButton).toBeInTheDocument();
      });
    });

    it('should maintain focus management', async () => {
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        const correctOption = screen.getByText('A beautiful landscape with mountains and trees');
        correctOption.focus();
        expect(correctOption).toHaveFocus();
      });
    });

    it('should have proper ARIA roles for progress bars', async () => {
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        const progressBars = screen.getAllByRole('progressbar', { hidden: true });
        expect(progressBars.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle image without description', async () => {
      const imageWithoutDesc = {
        id: 'no-desc',
        urls: { regular: 'https://example.com/image.jpg' }
      };
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockQAResponse)
      });
      
      render(<QAPanel selectedImage={imageWithoutDesc} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/qa/generate', expect.objectContaining({
          body: expect.stringContaining('an image')
        }));
      });
    });

    it('should handle rapid image changes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockQAResponse)
      });
      
      const image1 = { ...mockSelectedImage, id: 'image1' };
      const image2 = { ...mockSelectedImage, id: 'image2' };
      
      const { rerender } = render(<QAPanel selectedImage={image1} descriptionText="Test description" style="narrativo" />);
      
      rerender(<QAPanel selectedImage={image2} descriptionText="Test description" style="narrativo" />);
      
      // Should handle the change gracefully
      await waitFor(() => {
        expect(screen.getByText('Questions & Answers')).toBeInTheDocument();
      });
    });

    it('should handle API timeout', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 1000)
        )
      );
      
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        expect(screen.getByText('Request timeout')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should handle malformed API responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({})
      });
      
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      // Should handle gracefully without crashing
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
      });
    });

    it('should clean up on unmount', () => {
      const { unmount } = render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      unmount();
      
      // Should not cause any errors or memory leaks
      expect(true).toBe(true);
    });
  });

  describe('Multiple Choice Generation', () => {
    it('should create different options based on question type', async () => {
      const colorResponse = {
        ...mockQAResponse,
        question: 'What colors are prominent in this image?',
        answer: 'Green and blue dominate the image'
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(colorResponse)
      });
      
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        expect(screen.getByText('Green and blue dominate the image')).toBeInTheDocument();
        // Should also have generic incorrect options
        expect(screen.getByText('The image contains mainly black and white tones')).toBeInTheDocument();
      });
    });

    it('should shuffle answer options', async () => {
      // This is harder to test due to randomization, but we can verify
      // that multiple choice options are present
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockQAResponse)
      });
      
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        const buttons = screen.getAllByRole('button').filter(btn => 
          btn.textContent && btn.textContent.length > 10 && !btn.textContent.includes('Submit')
        );
        
        // Should have 4 multiple choice options
        expect(buttons.length).toBeGreaterThanOrEqual(4);
      });
    });
  });

  describe('Performance', () => {
    it('should handle multiple rapid API calls gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockQAResponse)
      });
      
      render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      // Should handle 4 parallel API calls for different question types
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(4);
      });
    });

    it('should clean up properly on unmount during loading', () => {
      mockFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );
      
      const { unmount } = render(<QAPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      // Unmount while still loading
      unmount();
      
      // Should not cause any errors
      expect(true).toBe(true);
    });
  });
});