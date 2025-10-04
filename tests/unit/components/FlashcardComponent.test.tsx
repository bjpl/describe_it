import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FlashcardComponent from '@/components/FlashcardComponent';
import type { SavedPhrase } from '@/types/api';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  RotateCcw: ({ className }: { className?: string }) => (
    <div data-testid="rotate-icon" className={className}>Rotate</div>
  ),
  Volume2: ({ className }: { className?: string }) => (
    <div data-testid="volume-icon" className={className}>Volume</div>
  ),
  Eye: ({ className }: { className?: string }) => (
    <div data-testid="eye-icon" className={className}>Eye</div>
  ),
  EyeOff: ({ className }: { className?: string }) => (
    <div data-testid="eye-off-icon" className={className}>EyeOff</div>
  ),
  ArrowLeft: ({ className }: { className?: string }) => (
    <div data-testid="arrow-left-icon" className={className}>ArrowLeft</div>
  ),
  ArrowRight: ({ className }: { className?: string }) => (
    <div data-testid="arrow-right-icon" className={className}>ArrowRight</div>
  ),
}));

// Mock phrase data
const mockPhrases: SavedPhrase[] = [
  {
    id: '1',
    phrase: 'hola',
    definition: 'hello',
    category: 'greetings',
    partOfSpeech: 'interjection',
    difficulty: 'beginner',
    context: 'Hola, ¿cómo estás?',
    sortKey: 'hola',
    saved: true,
    createdAt: new Date('2024-01-01'),
    savedAt: new Date('2024-01-01'),
    translation: 'hello',
    studyProgress: {
      correctAnswers: 0,
      totalAttempts: 0,
      lastReviewed: new Date('2024-01-01'),
      nextReview: new Date('2024-01-02')
    }
  },
  {
    id: '2',
    phrase: 'gato',
    definition: 'cat',
    category: 'animals',
    partOfSpeech: 'noun',
    difficulty: 'intermediate',
    context: 'El gato está durmiendo.',
    sortKey: 'gato',
    saved: true,
    createdAt: new Date('2024-01-01'),
    savedAt: new Date('2024-01-01'),
    translation: 'cat',
    gender: 'masculino',
    article: 'el',
    studyProgress: {
      correctAnswers: 1,
      totalAttempts: 2,
      lastReviewed: new Date('2024-01-01'),
      nextReview: new Date('2024-01-02')
    }
  },
  {
    id: '3',
    phrase: 'correr',
    definition: 'to run',
    category: 'verbs',
    partOfSpeech: 'verb',
    difficulty: 'advanced',
    context: 'Me gusta correr en el parque.',
    sortKey: 'correr',
    saved: true,
    createdAt: new Date('2024-01-01'),
    savedAt: new Date('2024-01-01'),
    translation: 'to run',
    conjugation: 'correr',
    studyProgress: {
      correctAnswers: 2,
      totalAttempts: 3,
      lastReviewed: new Date('2024-01-01'),
      nextReview: new Date('2024-01-02')
    }
  }
];

const mockProps = {
  phrase: mockPhrases[0],
  onAnswer: vi.fn(),
  onNext: vi.fn(),
  onPrevious: vi.fn(),
  currentIndex: 0,
  totalCount: 3,
  showNavigation: true,
  autoAdvance: false
};

describe('FlashcardComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render flashcard with Spanish text', () => {
      render(<FlashcardComponent {...mockProps} />);
      
      expect(screen.getByText('"hola"')).toBeInTheDocument();
    });

    it('should show card counter', () => {
      render(<FlashcardComponent {...mockProps} />);
      
      expect(screen.getByText('Card 1 of 3')).toBeInTheDocument();
    });

    it('should show navigation buttons', () => {
      render(<FlashcardComponent {...mockProps} />);
      
      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    it('should show flip instruction', () => {
      render(<FlashcardComponent {...mockProps} />);
      
      expect(screen.getByText('Click to reveal answer')).toBeInTheDocument();
    });

    it('should display difficulty indicator', () => {
      render(<FlashcardComponent {...mockProps} />);
      
      expect(screen.getByText('beginner')).toBeInTheDocument();
    });

    it('should display category', () => {
      render(<FlashcardComponent {...mockProps} />);
      
      expect(screen.getByText('greetings')).toBeInTheDocument();
    });
  });

  describe('Card Flipping', () => {
    it('should flip card to show definition', () => {
      render(<FlashcardComponent {...mockProps} />);
      
      const card = screen.getByText('"hola"').closest('.flashcard');
      fireEvent.click(card!);
      
      expect(screen.getByText('hello')).toBeInTheDocument();
    });

    it('should show context sentence after flipping', () => {
      render(<FlashcardComponent {...mockProps} />);
      
      const card = screen.getByText('"hola"').closest('.flashcard');
      fireEvent.click(card!);
      
      expect(screen.getByText('"Hola, ¿cómo estás?"')).toBeInTheDocument();
    });

    it('should flip back to Spanish side', () => {
      render(<FlashcardComponent {...mockProps} />);
      
      const card = screen.getByText('"hola"').closest('.flashcard');
      
      // Flip to definition
      fireEvent.click(card!);
      expect(screen.getByText('hello')).toBeInTheDocument();
      
      // Flip back to Spanish
      fireEvent.click(card!);
      expect(screen.getByText('"hola"')).toBeInTheDocument();
    });

    it('should show answer buttons after flipping', () => {
      render(<FlashcardComponent {...mockProps} />);
      
      const card = screen.getByText('"hola"').closest('.flashcard');
      fireEvent.click(card!);
      
      expect(screen.getByText('Wrong (1)')).toBeInTheDocument();
      expect(screen.getByText('Hard (3)')).toBeInTheDocument();
      expect(screen.getByText('Good (4)')).toBeInTheDocument();
      expect(screen.getByText('Easy (5)')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should call onNext when next button is clicked', () => {
      render(<FlashcardComponent {...mockProps} />);
      
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);
      
      expect(mockProps.onNext).toHaveBeenCalled();
    });

    it('should call onPrevious when previous button is clicked', () => {
      const propsWithIndex = { ...mockProps, currentIndex: 1 };
      render(<FlashcardComponent {...propsWithIndex} />);
      
      const prevButton = screen.getByText('Previous');
      fireEvent.click(prevButton);
      
      expect(mockProps.onPrevious).toHaveBeenCalled();
    });

    it('should disable previous button on first card', () => {
      render(<FlashcardComponent {...mockProps} />);
      
      const prevButton = screen.getByText('Previous');
      expect(prevButton.closest('button')).toBeDisabled();
    });

    it('should disable next button on last card', () => {
      const lastCardProps = { ...mockProps, currentIndex: 2 };
      render(<FlashcardComponent {...lastCardProps} />);
      
      const nextButton = screen.getByText('Next');
      expect(nextButton.closest('button')).toBeDisabled();
    });
  });

  describe('Answer Quality Selection', () => {
    it('should call onAnswer when quality button is clicked', () => {
      render(<FlashcardComponent {...mockProps} />);
      
      // Flip card first
      const card = screen.getByText('"hola"').closest('.flashcard');
      fireEvent.click(card!);
      
      // Click Easy button
      const easyButton = screen.getByText('Easy (5)');
      fireEvent.click(easyButton);
      
      expect(mockProps.onAnswer).toHaveBeenCalledWith(5);
    });

    it('should handle different quality ratings', () => {
      render(<FlashcardComponent {...mockProps} />);
      
      // Flip card first
      const card = screen.getByText('"hola"').closest('.flashcard');
      fireEvent.click(card!);
      
      // Test all quality buttons
      const wrongButton = screen.getByText('Wrong (1)');
      fireEvent.click(wrongButton);
      expect(mockProps.onAnswer).toHaveBeenCalledWith(0);
      
      vi.clearAllMocks();
      
      const hardButton = screen.getByText('Hard (3)');
      fireEvent.click(hardButton);
      expect(mockProps.onAnswer).toHaveBeenCalledWith(3);
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should flip card with spacebar', () => {
      render(<FlashcardComponent {...mockProps} />);
      
      const container = screen.getByText('"hola"').closest('.flashcard-container');
      fireEvent.keyDown(container!, { key: ' ' });
      
      expect(screen.getByText('hello')).toBeInTheDocument();
    });

    it('should navigate with arrow keys', () => {
      render(<FlashcardComponent {...mockProps} />);
      
      const container = screen.getByText('"hola"').closest('.flashcard-container');
      fireEvent.keyDown(container!, { key: 'ArrowRight' });
      
      expect(mockProps.onNext).toHaveBeenCalled();
    });

    it('should show hint with H key', () => {
      render(<FlashcardComponent {...mockProps} />);
      
      const container = screen.getByText('"hola"').closest('.flashcard-container');
      fireEvent.keyDown(container!, { key: 'h' });
      
      expect(screen.getByText(/Hint:/)).toBeInTheDocument();
    });
  });

  describe('Audio Features', () => {
    beforeEach(() => {
      // Mock speech synthesis
      Object.defineProperty(window, 'speechSynthesis', {
        writable: true,
        value: {
          speak: vi.fn(),
          cancel: vi.fn(),
          pause: vi.fn(),
          resume: vi.fn(),
          getVoices: vi.fn(() => []),
        },
      });
    });

    it('should play audio when volume button is clicked', () => {
      render(<FlashcardComponent {...mockProps} />);
      
      const volumeIcon = screen.getByTestId('volume-icon');
      fireEvent.click(volumeIcon.closest('button')!);
      
      expect(window.speechSynthesis.speak).toHaveBeenCalled();
    });
  });

  describe('Progress Bar', () => {
    it('should show correct progress percentage', () => {
      const props = { ...mockProps, currentIndex: 1 };
      render(<FlashcardComponent {...props} />);
      
      const progressBar = document.querySelector('.bg-blue-600');
      expect(progressBar).toHaveStyle('width: 66.66666666666666%');
    });

    it('should update progress as cards advance', () => {
      const { rerender } = render(<FlashcardComponent {...mockProps} />);
      
      let progressBar = document.querySelector('.bg-blue-600');
      expect(progressBar).toHaveStyle('width: 33.33333333333333%');
      
      // Advance to next card
      const nextProps = { ...mockProps, currentIndex: 2 };
      rerender(<FlashcardComponent {...nextProps} />);
      
      progressBar = document.querySelector('.bg-blue-600');
      expect(progressBar).toHaveStyle('width: 100%');
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard navigable', () => {
      render(<FlashcardComponent {...mockProps} />);
      
      const container = screen.getByText('"hola"').closest('.flashcard-container');
      expect(container).toHaveAttribute('tabIndex', '0');
    });

    it('should have proper focus management', () => {
      render(<FlashcardComponent {...mockProps} />);
      
      const container = screen.getByText('"hola"').closest('.flashcard-container') as HTMLElement;
      container?.focus();
      
      expect(container).toHaveFocus();
    });
  });

  describe('No Navigation Mode', () => {
    it('should hide navigation when showNavigation is false', () => {
      const propsNoNav = { ...mockProps, showNavigation: false };
      render(<FlashcardComponent {...propsNoNav} />);
      
      expect(screen.queryByText('Previous')).not.toBeInTheDocument();
      expect(screen.queryByText('Next')).not.toBeInTheDocument();
    });
  });

  describe('Auto Advance Mode', () => {
    it('should auto advance after timeout when autoAdvance is true', async () => {
      vi.useFakeTimers();
      
      const autoProps = { ...mockProps, autoAdvance: true };
      render(<FlashcardComponent {...autoProps} />);
      
      // Flip card first
      const card = screen.getByText('"hola"').closest('.flashcard');
      fireEvent.click(card!);
      
      // Fast forward time
      vi.advanceTimersByTime(3000);
      
      await waitFor(() => {
        expect(mockProps.onNext).toHaveBeenCalled();
      });
      
      vi.useRealTimers();
    });
  });
});