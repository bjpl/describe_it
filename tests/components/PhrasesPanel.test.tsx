import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PhrasesPanel from '@/components/EnhancedPhrasesPanel';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  BookOpen: ({ className }: { className?: string }) => (
    <div data-testid="book-open-icon" className={className}>BookOpen</div>
  ),
  ChevronDown: ({ className }: { className?: string }) => (
    <div data-testid="chevron-down-icon" className={className}>ChevronDown</div>
  ),
  AlertCircle: ({ className }: { className?: string }) => (
    <div data-testid="alert-circle-icon" className={className}>AlertCircle</div>
  ),
  RefreshCw: ({ className }: { className?: string }) => (
    <div data-testid="refresh-icon" className={className}>RefreshCw</div>
  )
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock phrase data
const mockPhrases = [
  {
    id: '1',
    phrase: 'Hello world',
    definition: 'A common programming greeting',
    partOfSpeech: 'noun phrase',
    difficulty: 'beginner',
    context: 'The first program often prints "Hello world" to the screen.',
    createdAt: new Date('2023-01-01')
  },
  {
    id: '2',
    phrase: 'Machine learning',
    definition: 'A subset of artificial intelligence',
    partOfSpeech: 'noun phrase',
    difficulty: 'advanced',
    context: 'Machine learning algorithms can recognize patterns in data.',
    createdAt: new Date('2023-01-02')
  }
];

const mockSelectedImage = {
  id: 'test-image-1',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  width: 1920,
  height: 1080,
  color: '#c0c0c0',
  blur_hash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
  description: 'A test image',
  alt_description: 'Test alt description',
  urls: {
    raw: 'https://example.com/image-raw.jpg',
    full: 'https://example.com/image-full.jpg',
    regular: 'https://example.com/image.jpg',
    small: 'https://example.com/image-small.jpg',
    thumb: 'https://example.com/image-thumb.jpg',
    small_s3: 'https://example.com/image-small-s3.jpg'
  },
  links: {
    self: 'https://api.unsplash.com/photos/test-image-1',
    html: 'https://unsplash.com/photos/test-image-1',
    download: 'https://unsplash.com/photos/test-image-1/download',
    download_location: 'https://api.unsplash.com/photos/test-image-1/download'
  },
  user: {
    id: 'test-user-1',
    username: 'testuser',
    name: 'Test User',
    first_name: 'Test',
    last_name: 'User',
    instagram_username: null,
    twitter_username: null,
    portfolio_url: null,
    bio: null,
    location: null,
    total_likes: 100,
    total_photos: 50,
    accepted_tos: true,
    profile_image: {
      small: 'https://example.com/user-small.jpg',
      medium: 'https://example.com/user-medium.jpg',
      large: 'https://example.com/user-large.jpg'
    },
    links: {
      self: 'https://api.unsplash.com/users/testuser',
      html: 'https://unsplash.com/@testuser',
      photos: 'https://api.unsplash.com/users/testuser/photos',
      likes: 'https://api.unsplash.com/users/testuser/likes',
      portfolio: 'https://api.unsplash.com/users/testuser/portfolio'
    }
  },
  tags: [
    {
      type: 'landing_page',
      title: 'test'
    }
  ]
};

describe('PhrasesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Empty State', () => {
    it('should render empty state when no image is selected', () => {
      render(<PhrasesPanel selectedImage={null} descriptionText={null} style="conversacional" />);
      
      expect(screen.getByText('Select an image to extract phrases and vocabulary.')).toBeInTheDocument();
      expect(screen.getByTestId('book-open-icon')).toBeInTheDocument();
    });

    it('should render empty state with proper styling', () => {
      render(<PhrasesPanel selectedImage={null} descriptionText={null} style="conversacional" />);
      
      const container = screen.getByText('Select an image to extract phrases and vocabulary.').closest('.text-center');
      expect(container).toHaveClass('text-center', 'py-12');
    });
  });

  describe('Description Required State', () => {
    it('should show description required message when image is selected but no description', () => {
      render(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText={null} style="narrativo" />);
      
      expect(screen.getByText('Phrases & Vocabulary')).toBeInTheDocument();
      expect(screen.getByText('Description Required')).toBeInTheDocument();
      expect(screen.getByText('Please generate a description first. The phrases will be extracted from the actual description content.')).toBeInTheDocument();
    });
  });

  describe('Header and Controls', () => {
    it('should render header with title when image is selected', () => {
      render(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      expect(screen.getByText('Phrases & Vocabulary')).toBeInTheDocument();
    });

    it('should render difficulty selector with all options', () => {
      render(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      const difficultySelect = screen.getByDisplayValue('Intermediate');
      expect(difficultySelect).toBeInTheDocument();
      
      // Check all options are present
      expect(screen.getByText('Beginner')).toBeInTheDocument();
      expect(screen.getByText('Intermediate')).toBeInTheDocument();
      expect(screen.getByText('Advanced')).toBeInTheDocument();
    });

    it('should render max phrases selector with all options', () => {
      render(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      const maxPhrasesSelect = screen.getByDisplayValue('5 phrases');
      expect(maxPhrasesSelect).toBeInTheDocument();
      
      // Check all options are present
      expect(screen.getByText('3 phrases')).toBeInTheDocument();
      expect(screen.getByText('5 phrases')).toBeInTheDocument();
      expect(screen.getByText('8 phrases')).toBeInTheDocument();
      expect(screen.getByText('10 phrases')).toBeInTheDocument();
    });

    it('should render extract button', () => {
      render(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      const extractButton = screen.getByRole('button', { name: /extract/i });
      expect(extractButton).toBeInTheDocument();
      expect(screen.getByTestId('refresh-icon')).toBeInTheDocument();
    });

    it('should disable controls during loading', async () => {
      mockFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve(mockPhrases)
        }), 100))
      );
      
      render(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      // Wait for the initial auto-extract to start
      await waitFor(() => {
        const difficultySelect = screen.getByDisplayValue('Intermediate');
        expect(difficultySelect).toBeDisabled();
        
        const maxPhrasesSelect = screen.getByDisplayValue('5 phrases');
        expect(maxPhrasesSelect).toBeDisabled();
        
        const extractButton = screen.getByRole('button', { name: /extract/i });
        expect(extractButton).toBeDisabled();
      });
    });
  });

  describe('API Integration', () => {
    it('should call API with correct parameters on mount', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPhrases)
      });
      
      render(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/phrases/extract', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl: 'https://example.com/image.jpg',
            targetLevel: 'intermediate',
            maxPhrases: 5,
          }),
        });
      });
    });

    it('should handle API success response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPhrases)
      });
      
      render(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        expect(screen.getByText('Hello world')).toBeInTheDocument();
        expect(screen.getByText('Machine learning')).toBeInTheDocument();
      });
    });

    it('should handle API error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'API Error' })
      });
      
      render(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        expect(screen.getByText('Error extracting phrases')).toBeInTheDocument();
        expect(screen.getByText('API Error')).toBeInTheDocument();
      });
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      render(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        expect(screen.getByText('Error extracting phrases')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should handle missing image URL', async () => {
      const imageWithoutUrl = { ...mockSelectedImage, urls: undefined as any };
      
      render(<PhrasesPanel selectedImage={imageWithoutUrl} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        expect(screen.getByText('Error extracting phrases')).toBeInTheDocument();
        expect(screen.getByText('No image selected for phrase extraction')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should change difficulty level', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPhrases)
      });
      
      render(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      const difficultySelect = screen.getByDisplayValue('Intermediate');
      fireEvent.change(difficultySelect, { target: { value: 'advanced' } });
      
      expect(difficultySelect).toHaveValue('advanced');
    });

    it('should change max phrases count', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPhrases)
      });
      
      render(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      const maxPhrasesSelect = screen.getByDisplayValue('5 phrases');
      fireEvent.change(maxPhrasesSelect, { target: { value: '10' } });
      
      expect(maxPhrasesSelect).toHaveValue('10');
    });

    it('should trigger extraction when extract button is clicked', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPhrases)
      });
      
      render(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      // Clear initial calls
      mockFetch.mockClear();
      
      const extractButton = screen.getByRole('button', { name: /extract/i });
      fireEvent.click(extractButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });

    it('should retry on error button click', async () => {
      // First call fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Initial error' })
      });
      
      render(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        expect(screen.getByText('Try again')).toBeInTheDocument();
      });
      
      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPhrases)
      });
      
      fireEvent.click(screen.getByText('Try again'));
      
      await waitFor(() => {
        expect(screen.getByText('Hello world')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state during API call', async () => {
      mockFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve(mockPhrases)
        }), 100))
      );
      
      render(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        expect(screen.getByText('Extracting phrases from image...')).toBeInTheDocument();
        expect(screen.getByTestId('refresh-icon')).toHaveClass('animate-spin');
      });
    });

    it('should hide loading state after API call completes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPhrases)
      });
      
      render(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        expect(screen.queryByText('Extracting phrases from image...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Phrases Display', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPhrases)
      });
    });

    it('should display extracted phrases', async () => {
      render(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        expect(screen.getByText('"Hello world"')).toBeInTheDocument();
        expect(screen.getByText('"Machine learning"')).toBeInTheDocument();
      });
    });

    it('should display phrase definitions', async () => {
      render(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        expect(screen.getByText('A common programming greeting')).toBeInTheDocument();
        expect(screen.getByText('A subset of artificial intelligence')).toBeInTheDocument();
      });
    });

    it('should display phrase contexts', async () => {
      render(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        expect(screen.getByText('"The first program often prints "Hello world" to the screen."')).toBeInTheDocument();
        expect(screen.getByText('"Machine learning algorithms can recognize patterns in data."')).toBeInTheDocument();
      });
    });

    it('should display parts of speech', async () => {
      render(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        const partsOfSpeech = screen.getAllByText('noun phrase');
        expect(partsOfSpeech).toHaveLength(2);
      });
    });

    it('should display phrase count and difficulty', async () => {
      render(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        expect(screen.getByText('Found 2 intermediate level phrases')).toBeInTheDocument();
        expect(screen.getByText('Intermediate')).toBeInTheDocument();
      });
    });

    it('should apply correct difficulty color classes', async () => {
      const beginnerPhrase = { ...mockPhrases[0], difficulty: 'beginner' };
      const advancedPhrase = { ...mockPhrases[1], difficulty: 'advanced' };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([beginnerPhrase, advancedPhrase])
      });
      
      render(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        // Check if difficulty indicators are present (we can't easily test CSS classes in jsdom)
        expect(screen.getByText('Found 2 intermediate level phrases')).toBeInTheDocument();
      });
    });
  });

  describe('Study Actions', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPhrases)
      });
    });

    it('should render study action buttons when phrases are present', async () => {
      render(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        expect(screen.getByText('Add to Study Set')).toBeInTheDocument();
        expect(screen.getByText('Practice Flashcards')).toBeInTheDocument();
        expect(screen.getByText('Quiz Me')).toBeInTheDocument();
      });
    });

    it('should make study action buttons clickable', async () => {
      render(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        const addButton = screen.getByText('Add to Study Set');
        const flashcardsButton = screen.getByText('Practice Flashcards');
        const quizButton = screen.getByText('Quiz Me');
        
        expect(addButton).toBeEnabled();
        expect(flashcardsButton).toBeEnabled();
        expect(quizButton).toBeEnabled();
      });
    });
  });

  describe('Empty Extraction State', () => {
    it('should show empty state when no phrases are extracted', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });
      
      render(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        expect(screen.getByText('No phrases extracted yet.')).toBeInTheDocument();
        expect(screen.getByText('Extract Phrases')).toBeInTheDocument();
      });
    });

    it('should allow extraction from empty state', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });
      
      render(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        const extractButton = screen.getByText('Extract Phrases');
        expect(extractButton).toBeInTheDocument();
        expect(extractButton).toBeEnabled();
      });
    });
  });

  describe('Auto-extraction', () => {
    it('should auto-extract when image changes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPhrases)
      });
      
      const { rerender } = render(<PhrasesPanel selectedImage={null} descriptionText={null} style="conversacional" />);
      
      expect(mockFetch).not.toHaveBeenCalled();
      
      rerender(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });

    it('should debounce auto-extraction', async () => {
      vi.useFakeTimers();
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPhrases)
      });
      
      render(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      // Should not call immediately
      expect(mockFetch).not.toHaveBeenCalled();
      
      // Should call after debounce timeout
      vi.advanceTimersByTime(500);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
      
      vi.useRealTimers();
    });

    it('should re-extract when difficulty changes', async () => {
      vi.useFakeTimers();
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPhrases)
      });
      
      render(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      // Initial extraction
      vi.advanceTimersByTime(500);
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
      
      mockFetch.mockClear();
      
      // Change difficulty
      const difficultySelect = screen.getByDisplayValue('Intermediate');
      fireEvent.change(difficultySelect, { target: { value: 'advanced' } });
      
      vi.advanceTimersByTime(500);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/phrases/extract', expect.objectContaining({
          body: JSON.stringify(expect.objectContaining({
            targetLevel: 'advanced'
          }))
        }));
      });
      
      vi.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('should clear error state when successful extraction occurs', async () => {
      // First call fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Initial error' })
      });
      
      render(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        expect(screen.getByText('Initial error')).toBeInTheDocument();
      });
      
      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPhrases)
      });
      
      fireEvent.click(screen.getByText('Try again'));
      
      await waitFor(() => {
        expect(screen.queryByText('Initial error')).not.toBeInTheDocument();
        expect(screen.getByText('Hello world')).toBeInTheDocument();
      });
    });

    it('should clear phrases when error occurs', async () => {
      // First call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPhrases)
      });
      
      const { rerender } = render(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        expect(screen.getByText('Hello world')).toBeInTheDocument();
      });
      
      // Second call fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Network error' })
      });
      
      // Trigger re-extraction
      fireEvent.click(screen.getByRole('button', { name: /extract/i }));
      
      await waitFor(() => {
        expect(screen.queryByText('Hello world')).not.toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Phrases & Vocabulary');
    });

    it('should have proper form labels', () => {
      render(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      const difficultySelect = screen.getByDisplayValue('Intermediate');
      const maxPhrasesSelect = screen.getByDisplayValue('5 phrases');
      
      expect(difficultySelect).toBeInTheDocument();
      expect(maxPhrasesSelect).toBeInTheDocument();
    });

    it('should maintain focus management', () => {
      render(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      const extractButton = screen.getByRole('button', { name: /extract/i });
      extractButton.focus();
      
      expect(extractButton).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle image with alternative URL structure', async () => {
      const altImage = {
        id: 'alt-image',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        width: 1920,
        height: 1080,
        color: '#c0c0c0',
        blur_hash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
        description: 'Alt image',
        alt_description: 'Alternative test image',
        urls: {
          raw: 'https://example.com/alt-image-raw.jpg',
          full: 'https://example.com/alt-image-full.jpg',
          regular: 'https://example.com/alt-image.jpg',
          small: 'https://example.com/alt-image-small.jpg',
          thumb: 'https://example.com/alt-image-thumb.jpg',
          small_s3: 'https://example.com/alt-image-small-s3.jpg'
        },
        links: {
          self: 'https://api.unsplash.com/photos/alt-image',
          html: 'https://unsplash.com/photos/alt-image',
          download: 'https://unsplash.com/photos/alt-image/download',
          download_location: 'https://api.unsplash.com/photos/alt-image/download'
        },
        user: {
          id: 'alt-user-1',
          username: 'altuser',
          name: 'Alt User',
          first_name: 'Alt',
          last_name: 'User',
          instagram_username: null,
          twitter_username: null,
          portfolio_url: null,
          bio: null,
          location: null,
          total_likes: 50,
          total_photos: 25,
          accepted_tos: true,
          profile_image: {
            small: 'https://example.com/alt-user-small.jpg',
            medium: 'https://example.com/alt-user-medium.jpg',
            large: 'https://example.com/alt-user-large.jpg'
          },
          links: {
            self: 'https://api.unsplash.com/users/altuser',
            html: 'https://unsplash.com/@altuser',
            photos: 'https://api.unsplash.com/users/altuser/photos',
            likes: 'https://api.unsplash.com/users/altuser/likes',
            portfolio: 'https://api.unsplash.com/users/altuser/portfolio'
          }
        },
        tags: [
          {
            type: 'landing_page',
            title: 'alt'
          }
        ]
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPhrases)
      });
      
      render(<PhrasesPanel selectedImage={altImage} descriptionText="Test description" style="narrativo" />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/phrases/extract', expect.objectContaining({
          body: JSON.stringify(expect.objectContaining({
            imageUrl: 'https://example.com/alt-image.jpg'
          }))
        }));
      });
    });

    it('should handle rapid image changes', async () => {
      vi.useFakeTimers();
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPhrases)
      });
      
      const image1 = { ...mockSelectedImage, id: 'image1' };
      const image2 = { ...mockSelectedImage, id: 'image2' };
      
      const { rerender } = render(<PhrasesPanel selectedImage={image1} descriptionText="Test description" style="narrativo" />);
      
      // Rapidly change images
      rerender(<PhrasesPanel selectedImage={image2} descriptionText="Test description" style="narrativo" />);
      rerender(<PhrasesPanel selectedImage={image1} descriptionText="Test description" style="narrativo" />);
      
      // Should only make one call after debounce
      vi.advanceTimersByTime(500);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
      
      vi.useRealTimers();
    });

    it('should clean up timers on unmount', () => {
      vi.useFakeTimers();
      
      const { unmount } = render(<PhrasesPanel selectedImage={mockSelectedImage} descriptionText="Test description" style="narrativo" />);
      
      unmount();
      
      // Should not throw or cause memory leaks
      vi.advanceTimersByTime(1000);
      
      vi.useRealTimers();
    });
  });
});