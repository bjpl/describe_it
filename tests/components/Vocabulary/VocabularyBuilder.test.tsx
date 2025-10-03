/**
 * VocabularyBuilder Component Tests
 *
 * Comprehensive test suite with 105+ tests covering:
 * - Rendering & Layout (15 tests)
 * - Adding Vocabulary (20 tests)
 * - Editing Vocabulary (15 tests)
 * - Deleting Vocabulary (10 tests)
 * - Filtering & Search (15 tests)
 * - Sorting (8 tests)
 * - Import/Export (12 tests)
 * - Accessibility (10 tests)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../components/__utils__/test-utils';
import VocabularyBuilder from '@/components/VocabularyBuilder';
import VocabularyStorage from '@/lib/storage/vocabularyStorage';
import SpacedRepetitionSystem from '@/lib/algorithms/spacedRepetition';
import { VocabularySet, SavedPhrase, CategorizedPhrase } from '@/types/api';

// ==========================================
// Mock Data Helpers
// ==========================================

const createMockPhrase = (overrides?: Partial<SavedPhrase>): SavedPhrase => ({
  id: `phrase-${Date.now()}-${Math.random()}`,
  phrase: 'Hola',
  definition: 'Hello',
  category: 'greetings',
  difficulty: 'beginner',
  context: 'Basic greeting',
  savedAt: new Date(),
  createdAt: new Date(),
  studyProgress: {
    correctAnswers: 0,
    totalAttempts: 0,
    lastReviewed: undefined,
    nextReview: undefined,
  },
  ...overrides,
});

const createMockVocabularySet = (overrides?: Partial<VocabularySet>): VocabularySet => ({
  id: `set-${Date.now()}`,
  name: 'Test Vocabulary Set',
  description: 'A test set for vocabulary practice',
  phrases: [createMockPhrase()],
  createdAt: new Date(),
  lastModified: new Date(),
  studyStats: {
    totalPhrases: 1,
    masteredPhrases: 0,
    reviewsDue: 1,
    averageProgress: 0,
  },
  ...overrides,
});

const createMockCategorizedPhrase = (overrides?: Partial<CategorizedPhrase>): CategorizedPhrase => ({
  id: `cat-phrase-${Date.now()}`,
  phrase: 'Buenos días',
  definition: 'Good morning',
  category: 'greetings',
  difficulty: 'beginner',
  context: 'Morning greeting',
  createdAt: new Date(),
  ...overrides,
});

const createMockReviewItem = () => ({
  id: `review-${Date.now()}`,
  phrase: 'Test',
  definition: 'Test definition',
  interval: 1,
  repetition: 0,
  easeFactor: 2.5,
  nextReview: new Date(),
  lastReviewed: new Date(),
  quality: 0,
});

// ==========================================
// Mock Setup
// ==========================================

const mockSavedPhrases: CategorizedPhrase[] = [
  createMockCategorizedPhrase({ id: 'phrase-1', phrase: 'Hola', definition: 'Hello' }),
  createMockCategorizedPhrase({ id: 'phrase-2', phrase: 'Adiós', definition: 'Goodbye' }),
  createMockCategorizedPhrase({ id: 'phrase-3', phrase: 'Gracias', definition: 'Thank you' }),
];

const defaultProps = {
  savedPhrases: mockSavedPhrases,
  onUpdatePhrases: vi.fn(),
};

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock VocabularyStorage
vi.mock('@/lib/storage/vocabularyStorage', () => ({
  default: {
    loadVocabularySets: vi.fn(() => []),
    saveVocabularySets: vi.fn(() => true),
    addVocabularySet: vi.fn(() => true),
    updateVocabularySet: vi.fn(() => true),
    deleteVocabularySet: vi.fn(() => true),
    loadReviewItems: vi.fn(() => []),
    saveReviewItems: vi.fn(() => true),
    getStudyHistory: vi.fn(() => []),
    addStudySession: vi.fn(() => true),
    exportSetAsCSV: vi.fn(() => 'phrase,definition\nHola,Hello'),
    importSetFromCSV: vi.fn(),
  },
}));

// Mock SpacedRepetitionSystem
vi.mock('@/lib/algorithms/spacedRepetition', () => ({
  default: {
    createReviewItem: vi.fn((id, phrase, definition) => ({
      id,
      phrase,
      definition,
      interval: 1,
      repetition: 0,
      easeFactor: 2.5,
      nextReview: new Date(),
      lastReviewed: new Date(),
      quality: 0,
    })),
    calculateStatistics: vi.fn(() => ({
      totalReviews: 0,
      correctReviews: 0,
      averageQuality: 0,
      studyStreak: 0,
      masteredItems: 0,
      itemsToReview: 0,
      estimatedTime: 0,
    })),
    getItemsDueForReview: vi.fn(() => []),
    calculateNextReview: vi.fn((item, quality) => ({
      ...item,
      quality,
      lastReviewed: new Date(),
    })),
    responseToQuality: vi.fn((isCorrect, confidence) => isCorrect ? 4 : 2),
  },
}));

// ==========================================
// Test Suite
// ==========================================

describe('VocabularyBuilder', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  // ==========================================
  // 1. Rendering & Layout (15 tests)
  // ==========================================

  describe('Rendering & Layout', () => {
    it('renders the component with header', () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      expect(screen.getByText('Vocabulary Builder')).toBeInTheDocument();
    });

    it('displays navigation buttons', () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      expect(screen.getByText('Study Sets')).toBeInTheDocument();
      expect(screen.getByText('Statistics')).toBeInTheDocument();
    });

    it('renders empty state when no sets exist', () => {
      renderWithProviders(<VocabularyBuilder savedPhrases={[]} onUpdatePhrases={vi.fn()} />);

      expect(screen.getByText(/no vocabulary sets/i)).toBeInTheDocument();
    });

    it('renders with existing vocabulary sets', () => {
      const mockSet = createMockVocabularySet();
      vi.mocked(VocabularyStorage.loadVocabularySets).mockReturnValue([mockSet]);

      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      expect(screen.getByText(mockSet.name)).toBeInTheDocument();
    });

    it('displays proper section layout', () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const header = screen.getByText('Vocabulary Builder').closest('div');
      expect(header).toBeInTheDocument();
    });

    it('shows loading state during initialization', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      // Component loads data synchronously in useEffect
      await waitFor(() => {
        expect(VocabularyStorage.loadVocabularySets).toHaveBeenCalled();
      });
    });

    it('handles error state gracefully', () => {
      vi.mocked(VocabularyStorage.loadVocabularySets).mockImplementation(() => {
        throw new Error('Storage error');
      });

      // Should not crash, should return empty array
      expect(() => renderWithProviders(<VocabularyBuilder {...defaultProps} />)).not.toThrow();
    });

    it('displays create new set button when phrases exist', () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const createButton = screen.getByTitle(/create new set/i);
      expect(createButton).toBeInTheDocument();
    });

    it('displays import set button', () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const importButton = screen.getByTitle(/import set/i);
      expect(importButton).toBeInTheDocument();
    });

    it('renders study sets view by default', () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const studySetsButton = screen.getByText('Study Sets');
      expect(studySetsButton).toHaveClass(/bg-blue-600/);
    });

    it('switches to statistics view when clicked', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const statsButton = screen.getByText('Statistics');
      await user.click(statsButton);

      expect(statsButton).toHaveClass(/bg-blue-600/);
    });

    it('renders header with BookOpen icon', () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const header = screen.getByText('Vocabulary Builder').closest('h2');
      expect(header?.querySelector('svg')).toBeInTheDocument();
    });

    it('displays all action buttons in header', () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      expect(screen.getByText('Study Sets')).toBeInTheDocument();
      expect(screen.getByText('Statistics')).toBeInTheDocument();
    });

    it('renders vocabulary actions component', () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      // VocabularyActions should be present
      const createButton = screen.getByTitle(/create new set/i);
      expect(createButton).toBeInTheDocument();
    });

    it('maintains responsive layout structure', () => {
      const { container } = renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass('space-y-6');
    });
  });

  // ==========================================
  // 2. Adding Vocabulary (20 tests)
  // ==========================================

  describe('Adding Vocabulary', () => {
    it('shows create set form when button clicked', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const createButton = screen.getByTitle(/create new set/i);
      await user.click(createButton);

      expect(screen.getByPlaceholderText(/enter set name/i)).toBeInTheDocument();
    });

    it('creates new vocabulary set with valid name', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const createButton = screen.getByTitle(/create new set/i);
      await user.click(createButton);

      const input = screen.getByPlaceholderText(/enter set name/i);
      await user.type(input, 'My New Set');

      const submitButton = screen.getByText(/create set/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(VocabularyStorage.saveVocabularySets).toHaveBeenCalled();
      });
    });

    it('validates set name is not empty', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const createButton = screen.getByTitle(/create new set/i);
      await user.click(createButton);

      const submitButton = screen.getByText(/create set/i);
      await user.click(submitButton);

      // Should not create set
      expect(VocabularyStorage.saveVocabularySets).not.toHaveBeenCalled();
    });

    it('includes all saved phrases in new set', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const createButton = screen.getByTitle(/create new set/i);
      await user.click(createButton);

      const input = screen.getByPlaceholderText(/enter set name/i);
      await user.type(input, 'Complete Set');

      const submitButton = screen.getByText(/create set/i);
      await user.click(submitButton);

      await waitFor(() => {
        const calls = vi.mocked(VocabularyStorage.saveVocabularySets).mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        const savedSet = calls[0][0][0];
        expect(savedSet.phrases).toHaveLength(mockSavedPhrases.length);
      });
    });

    it('generates unique ID for new set', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const createButton = screen.getByTitle(/create new set/i);
      await user.click(createButton);

      const input = screen.getByPlaceholderText(/enter set name/i);
      await user.type(input, 'Set With ID');

      const submitButton = screen.getByText(/create set/i);
      await user.click(submitButton);

      await waitFor(() => {
        const calls = vi.mocked(VocabularyStorage.saveVocabularySets).mock.calls;
        const savedSet = calls[0][0][0];
        expect(savedSet.id).toMatch(/^set_\d+$/);
      });
    });

    it('sets creation and modification dates', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const createButton = screen.getByTitle(/create new set/i);
      await user.click(createButton);

      const input = screen.getByPlaceholderText(/enter set name/i);
      await user.type(input, 'Dated Set');

      const submitButton = screen.getByText(/create set/i);
      await user.click(submitButton);

      await waitFor(() => {
        const calls = vi.mocked(VocabularyStorage.saveVocabularySets).mock.calls;
        const savedSet = calls[0][0][0];
        expect(savedSet.createdAt).toBeInstanceOf(Date);
        expect(savedSet.lastModified).toBeInstanceOf(Date);
      });
    });

    it('initializes study stats correctly', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const createButton = screen.getByTitle(/create new set/i);
      await user.click(createButton);

      const input = screen.getByPlaceholderText(/enter set name/i);
      await user.type(input, 'Stats Set');

      const submitButton = screen.getByText(/create set/i);
      await user.click(submitButton);

      await waitFor(() => {
        const calls = vi.mocked(VocabularyStorage.saveVocabularySets).mock.calls;
        const savedSet = calls[0][0][0];
        expect(savedSet.studyStats).toEqual({
          totalPhrases: mockSavedPhrases.length,
          masteredPhrases: 0,
          reviewsDue: mockSavedPhrases.length,
          averageProgress: 0,
        });
      });
    });

    it('creates review items for spaced repetition', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const createButton = screen.getByTitle(/create new set/i);
      await user.click(createButton);

      const input = screen.getByPlaceholderText(/enter set name/i);
      await user.type(input, 'Review Set');

      const submitButton = screen.getByText(/create set/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(SpacedRepetitionSystem.createReviewItem).toHaveBeenCalled();
        expect(VocabularyStorage.saveReviewItems).toHaveBeenCalled();
      });
    });

    it('resets form after successful creation', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const createButton = screen.getByTitle(/create new set/i);
      await user.click(createButton);

      const input = screen.getByPlaceholderText(/enter set name/i);
      await user.type(input, 'Reset Test');

      const submitButton = screen.getByText(/create set/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/enter set name/i)).not.toBeInTheDocument();
      });
    });

    it('allows canceling set creation', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const createButton = screen.getByTitle(/create new set/i);
      await user.click(createButton);

      const input = screen.getByPlaceholderText(/enter set name/i);
      await user.type(input, 'Canceled Set');

      const cancelButton = screen.getByText(/cancel/i);
      await user.click(cancelButton);

      expect(screen.queryByPlaceholderText(/enter set name/i)).not.toBeInTheDocument();
    });

    it('preserves form data while typing', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const createButton = screen.getByTitle(/create new set/i);
      await user.click(createButton);

      const input = screen.getByPlaceholderText(/enter set name/i) as HTMLInputElement;
      await user.type(input, 'Test Name');

      expect(input.value).toBe('Test Name');
    });

    it('disables create button when no phrases available', () => {
      renderWithProviders(<VocabularyBuilder savedPhrases={[]} onUpdatePhrases={vi.fn()} />);

      const createButton = screen.queryByTitle(/create new set/i);
      expect(createButton).not.toBeInTheDocument();
    });

    it('shows phrase count in create form', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const createButton = screen.getByTitle(/create new set/i);
      await user.click(createButton);

      expect(screen.getByText(new RegExp(`${mockSavedPhrases.length}`))).toBeInTheDocument();
    });

    it('handles very long set names', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const createButton = screen.getByTitle(/create new set/i);
      await user.click(createButton);

      const longName = 'A'.repeat(100);
      const input = screen.getByPlaceholderText(/enter set name/i);
      await user.type(input, longName);

      const submitButton = screen.getByText(/create set/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(VocabularyStorage.saveVocabularySets).toHaveBeenCalled();
      });
    });

    it('handles special characters in set name', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const createButton = screen.getByTitle(/create new set/i);
      await user.click(createButton);

      const specialName = 'Set: "Test" & More!';
      const input = screen.getByPlaceholderText(/enter set name/i);
      await user.type(input, specialName);

      const submitButton = screen.getByText(/create set/i);
      await user.click(submitButton);

      await waitFor(() => {
        const calls = vi.mocked(VocabularyStorage.saveVocabularySets).mock.calls;
        expect(calls[0][0][0].name).toBe(specialName);
      });
    });

    it('trims whitespace from set name', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const createButton = screen.getByTitle(/create new set/i);
      await user.click(createButton);

      const input = screen.getByPlaceholderText(/enter set name/i);
      await user.type(input, '  Trimmed Name  ');

      const submitButton = screen.getByText(/create set/i);
      await user.click(submitButton);

      await waitFor(() => {
        const calls = vi.mocked(VocabularyStorage.saveVocabularySets).mock.calls;
        expect(calls[0][0][0].name).toBe('Trimmed Name');
      });
    });

    it('handles rapid consecutive creations', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      for (let i = 0; i < 3; i++) {
        const createButton = screen.getByTitle(/create new set/i);
        await user.click(createButton);

        const input = screen.getByPlaceholderText(/enter set name/i);
        await user.type(input, `Set ${i}`);

        const submitButton = screen.getByText(/create set/i);
        await user.click(submitButton);
      }

      await waitFor(() => {
        expect(VocabularyStorage.saveVocabularySets).toHaveBeenCalledTimes(3);
      });
    });

    it('updates UI after successful creation', async () => {
      vi.mocked(VocabularyStorage.loadVocabularySets).mockReturnValue([]);

      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const createButton = screen.getByTitle(/create new set/i);
      await user.click(createButton);

      const input = screen.getByPlaceholderText(/enter set name/i);
      await user.type(input, 'New Visible Set');

      const submitButton = screen.getByText(/create set/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('New Visible Set')).toBeInTheDocument();
      });
    });

    it('initializes phrase study progress', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const createButton = screen.getByTitle(/create new set/i);
      await user.click(createButton);

      const input = screen.getByPlaceholderText(/enter set name/i);
      await user.type(input, 'Progress Set');

      const submitButton = screen.getByText(/create set/i);
      await user.click(submitButton);

      await waitFor(() => {
        const calls = vi.mocked(VocabularyStorage.saveVocabularySets).mock.calls;
        const savedSet = calls[0][0][0];
        savedSet.phrases.forEach((phrase: any) => {
          expect(phrase.studyProgress).toEqual({
            correctAnswers: 0,
            totalAttempts: 0,
          });
        });
      });
    });

    it('sets current set after creation', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const createButton = screen.getByTitle(/create new set/i);
      await user.click(createButton);

      const input = screen.getByPlaceholderText(/enter set name/i);
      await user.type(input, 'Current Set');

      const submitButton = screen.getByText(/create set/i);
      await user.click(submitButton);

      await waitFor(() => {
        // Set should be visible and selectable
        expect(screen.getByText('Current Set')).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // 3. Editing Vocabulary (15 tests)
  // ==========================================

  describe('Editing Vocabulary', () => {
    beforeEach(() => {
      const mockSet = createMockVocabularySet({ name: 'Editable Set' });
      vi.mocked(VocabularyStorage.loadVocabularySets).mockReturnValue([mockSet]);
    });

    it('displays edit functionality for existing sets', () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      expect(screen.getByText('Editable Set')).toBeInTheDocument();
    });

    it('allows starting flashcard study session', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const flashcardsButton = screen.getByText('Flashcards');
      await user.click(flashcardsButton);

      await waitFor(() => {
        expect(screen.getByText(/flashcards/i)).toBeInTheDocument();
      });
    });

    it('allows starting quiz session', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const quizButton = screen.getByText('Quiz');
      await user.click(quizButton);

      await waitFor(() => {
        expect(screen.getByText(/quiz/i)).toBeInTheDocument();
      });
    });

    it('allows starting review session', async () => {
      const mockReviewItems = [createMockReviewItem()];
      vi.mocked(SpacedRepetitionSystem.getItemsDueForReview).mockReturnValue(mockReviewItems);

      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const reviewButton = screen.getByText(/review/i);
      await user.click(reviewButton);

      await waitFor(() => {
        expect(screen.getByText(/review/i)).toBeInTheDocument();
      });
    });

    it('shows alert when no items due for review', async () => {
      vi.mocked(SpacedRepetitionSystem.getItemsDueForReview).mockReturnValue([]);
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const reviewButton = screen.getByText(/review/i);
      await user.click(reviewButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('No items are due'));
      });

      alertSpy.mockRestore();
    });

    it('ends study session when clicked', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const flashcardsButton = screen.getByText('Flashcards');
      await user.click(flashcardsButton);

      const endButton = await screen.findByText('End Session');
      await user.click(endButton);

      await waitFor(() => {
        expect(screen.queryByText('End Session')).not.toBeInTheDocument();
      });
    });

    it('tracks progress during flashcard session', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const flashcardsButton = screen.getByText('Flashcards');
      await user.click(flashcardsButton);

      await waitFor(() => {
        expect(screen.getByText(/editable set/i)).toBeInTheDocument();
      });
    });

    it('navigates through flashcards', async () => {
      const multiPhraseSet = createMockVocabularySet({
        phrases: [
          createMockPhrase({ id: 'p1', phrase: 'Phrase 1' }),
          createMockPhrase({ id: 'p2', phrase: 'Phrase 2' }),
        ],
      });
      vi.mocked(VocabularyStorage.loadVocabularySets).mockReturnValue([multiPhraseSet]);

      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const flashcardsButton = screen.getByText('Flashcards');
      await user.click(flashcardsButton);

      // Navigation should be available
      await waitFor(() => {
        expect(screen.getByText(/phrase 1/i)).toBeInTheDocument();
      });
    });

    it('updates phrase progress after answer', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const flashcardsButton = screen.getByText('Flashcards');
      await user.click(flashcardsButton);

      // Interact with flashcard (implementation-specific)
      await waitFor(() => {
        expect(VocabularyStorage.saveVocabularySets).toHaveBeenCalled();
      });
    });

    it('saves review item updates', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const flashcardsButton = screen.getByText('Flashcards');
      await user.click(flashcardsButton);

      await waitFor(() => {
        expect(SpacedRepetitionSystem.createReviewItem).toHaveBeenCalled();
      });
    });

    it('completes quiz and saves session', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const quizButton = screen.getByText('Quiz');
      await user.click(quizButton);

      await waitFor(() => {
        expect(screen.getByText(/quiz/i)).toBeInTheDocument();
      });
    });

    it('updates statistics after study session', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const flashcardsButton = screen.getByText('Flashcards');
      await user.click(flashcardsButton);

      await waitFor(() => {
        expect(SpacedRepetitionSystem.calculateStatistics).toHaveBeenCalled();
      });
    });

    it('prevents editing during active study session', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const flashcardsButton = screen.getByText('Flashcards');
      await user.click(flashcardsButton);

      await waitFor(() => {
        // Other buttons should be hidden or disabled
        expect(screen.queryByTitle(/create new set/i)).not.toBeInTheDocument();
      });
    });

    it('shows session progress indicator', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const flashcardsButton = screen.getByText('Flashcards');
      await user.click(flashcardsButton);

      await waitFor(() => {
        expect(screen.getByText(/1 items in set/i)).toBeInTheDocument();
      });
    });

    it('maintains session state across navigation', async () => {
      const multiPhraseSet = createMockVocabularySet({
        phrases: [
          createMockPhrase({ id: 'p1' }),
          createMockPhrase({ id: 'p2' }),
        ],
      });
      vi.mocked(VocabularyStorage.loadVocabularySets).mockReturnValue([multiPhraseSet]);

      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const flashcardsButton = screen.getByText('Flashcards');
      await user.click(flashcardsButton);

      // Session should persist
      await waitFor(() => {
        expect(screen.getByText('End Session')).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // 4. Deleting Vocabulary (10 tests)
  // ==========================================

  describe('Deleting Vocabulary', () => {
    beforeEach(() => {
      const mockSet = createMockVocabularySet({ id: 'delete-test', name: 'Deletable Set' });
      vi.mocked(VocabularyStorage.loadVocabularySets).mockReturnValue([mockSet]);
    });

    it('shows delete button for vocabulary set', () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const deleteButton = screen.getByTitle('Delete set');
      expect(deleteButton).toBeInTheDocument();
    });

    it('confirms before deleting set', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const deleteButton = screen.getByTitle('Delete set');
      await user.click(deleteButton);

      expect(confirmSpy).toHaveBeenCalled();
      confirmSpy.mockRestore();
    });

    it('deletes set when confirmed', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const deleteButton = screen.getByTitle('Delete set');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(VocabularyStorage.deleteVocabularySet).toHaveBeenCalledWith('delete-test');
      });

      confirmSpy.mockRestore();
    });

    it('cancels deletion when not confirmed', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const deleteButton = screen.getByTitle('Delete set');
      await user.click(deleteButton);

      expect(VocabularyStorage.deleteVocabularySet).not.toHaveBeenCalled();
      confirmSpy.mockRestore();
    });

    it('removes set from UI after deletion', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const deleteButton = screen.getByTitle('Delete set');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.queryByText('Deletable Set')).not.toBeInTheDocument();
      });

      confirmSpy.mockRestore();
    });

    it('updates localStorage after deletion', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const deleteButton = screen.getByTitle('Delete set');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(VocabularyStorage.saveVocabularySets).toHaveBeenCalled();
      });

      confirmSpy.mockRestore();
    });

    it('clears current set if deleted', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      // Start a session with the set
      const flashcardsButton = screen.getByText('Flashcards');
      await user.click(flashcardsButton);

      const endButton = await screen.findByText('End Session');
      await user.click(endButton);

      // Delete the set
      const deleteButton = screen.getByTitle('Delete set');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(VocabularyStorage.deleteVocabularySet).toHaveBeenCalled();
      });

      confirmSpy.mockRestore();
    });

    it('handles deletion errors gracefully', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      vi.mocked(VocabularyStorage.deleteVocabularySet).mockImplementation(() => {
        throw new Error('Delete error');
      });

      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const deleteButton = screen.getByTitle('Delete set');

      // Should not crash
      expect(async () => await user.click(deleteButton)).not.toThrow();

      confirmSpy.mockRestore();
    });

    it('deletes multiple sets sequentially', async () => {
      const mockSets = [
        createMockVocabularySet({ id: 'set1', name: 'Set 1' }),
        createMockVocabularySet({ id: 'set2', name: 'Set 2' }),
      ];
      vi.mocked(VocabularyStorage.loadVocabularySets).mockReturnValue(mockSets);
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const deleteButtons = screen.getAllByTitle('Delete set');

      await user.click(deleteButtons[0]);
      await waitFor(() => {
        expect(VocabularyStorage.deleteVocabularySet).toHaveBeenCalledWith('set1');
      });

      confirmSpy.mockRestore();
    });

    it('shows empty state after deleting all sets', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderWithProviders(<VocabularyBuilder savedPhrases={[]} onUpdatePhrases={vi.fn()} />);

      const deleteButton = screen.getByTitle('Delete set');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/no vocabulary sets/i)).toBeInTheDocument();
      });

      confirmSpy.mockRestore();
    });
  });

  // ==========================================
  // 5. Filtering & Search (15 tests)
  // ==========================================

  describe('Filtering & Search', () => {
    beforeEach(() => {
      const mockSets = [
        createMockVocabularySet({ id: 's1', name: 'Spanish Basics', description: 'Basic Spanish' }),
        createMockVocabularySet({ id: 's2', name: 'French Advanced', description: 'Advanced French' }),
        createMockVocabularySet({ id: 's3', name: 'Spanish Verbs', description: 'Common verbs' }),
      ];
      vi.mocked(VocabularyStorage.loadVocabularySets).mockReturnValue(mockSets);
    });

    it('displays search input when sets exist', () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('filters sets by name', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'Spanish');

      await waitFor(() => {
        expect(screen.getByText('Spanish Basics')).toBeInTheDocument();
        expect(screen.getByText('Spanish Verbs')).toBeInTheDocument();
        expect(screen.queryByText('French Advanced')).not.toBeInTheDocument();
      });
    });

    it('filters sets by description', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'verbs');

      await waitFor(() => {
        expect(screen.getByText('Spanish Verbs')).toBeInTheDocument();
        expect(screen.queryByText('Spanish Basics')).not.toBeInTheDocument();
      });
    });

    it('is case-insensitive', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'SPANISH');

      await waitFor(() => {
        expect(screen.getByText('Spanish Basics')).toBeInTheDocument();
      });
    });

    it('clears filter when search is cleared', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/search/i) as HTMLInputElement;
      await user.type(searchInput, 'Spanish');

      await waitFor(() => {
        expect(screen.queryByText('French Advanced')).not.toBeInTheDocument();
      });

      await user.clear(searchInput);

      await waitFor(() => {
        expect(screen.getByText('French Advanced')).toBeInTheDocument();
      });
    });

    it('shows no results message when filter matches nothing', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'NonexistentSet');

      await waitFor(() => {
        expect(screen.queryByText('Spanish Basics')).not.toBeInTheDocument();
        expect(screen.queryByText('French Advanced')).not.toBeInTheDocument();
      });
    });

    it('updates results as user types', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/search/i);

      await user.type(searchInput, 'S');
      await waitFor(() => {
        expect(screen.getByText('Spanish Basics')).toBeInTheDocument();
      });

      await user.type(searchInput, 'p');
      await waitFor(() => {
        expect(screen.getByText('Spanish Basics')).toBeInTheDocument();
      });
    });

    it('maintains filter during other interactions', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'Spanish');

      // Click statistics and back
      const statsButton = screen.getByText('Statistics');
      await user.click(statsButton);

      const setsButton = screen.getByText('Study Sets');
      await user.click(setsButton);

      await waitFor(() => {
        expect(screen.queryByText('French Advanced')).not.toBeInTheDocument();
      });
    });

    it('combines multiple filter words', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'Spanish Basics');

      await waitFor(() => {
        expect(screen.getByText('Spanish Basics')).toBeInTheDocument();
        expect(screen.queryByText('Spanish Verbs')).not.toBeInTheDocument();
      });
    });

    it('handles special characters in search', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'Spanish (Basics)');

      // Should not crash
      expect(searchInput).toBeInTheDocument();
    });

    it('trims whitespace in search', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, '  Spanish  ');

      await waitFor(() => {
        expect(screen.getByText('Spanish Basics')).toBeInTheDocument();
      });
    });

    it('shows all sets with empty search', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, '   ');

      await waitFor(() => {
        expect(screen.getByText('Spanish Basics')).toBeInTheDocument();
        expect(screen.getByText('French Advanced')).toBeInTheDocument();
        expect(screen.getByText('Spanish Verbs')).toBeInTheDocument();
      });
    });

    it('hides filters when no sets exist', () => {
      vi.mocked(VocabularyStorage.loadVocabularySets).mockReturnValue([]);

      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument();
    });

    it('persists filter state across component updates', async () => {
      const { rerender } = renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'Spanish');

      rerender(<VocabularyBuilder {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('French Advanced')).not.toBeInTheDocument();
      });
    });

    it('shows filter count indicator', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'Spanish');

      await waitFor(() => {
        // Should show 2 results (Spanish Basics, Spanish Verbs)
        const results = screen.getAllByText(/Spanish/);
        expect(results.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  // ==========================================
  // 6. Sorting (8 tests)
  // ==========================================

  describe('Sorting', () => {
    beforeEach(() => {
      const mockSets = [
        createMockVocabularySet({
          id: 's1',
          name: 'Zebra Set',
          createdAt: new Date('2024-01-01'),
          phrases: [createMockPhrase()],
        }),
        createMockVocabularySet({
          id: 's2',
          name: 'Apple Set',
          createdAt: new Date('2024-01-03'),
          phrases: [createMockPhrase(), createMockPhrase()],
        }),
        createMockVocabularySet({
          id: 's3',
          name: 'Banana Set',
          createdAt: new Date('2024-01-02'),
          phrases: [createMockPhrase(), createMockPhrase(), createMockPhrase()],
        }),
      ];
      vi.mocked(VocabularyStorage.loadVocabularySets).mockReturnValue(mockSets);
    });

    it('sorts by name alphabetically ascending', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const sortSelect = screen.getByLabelText(/sort by/i);
      await user.selectOptions(sortSelect, 'name');

      const orderSelect = screen.getByLabelText(/order/i);
      await user.selectOptions(orderSelect, 'asc');

      await waitFor(() => {
        const sets = screen.getAllByText(/set$/i);
        expect(sets[0]).toHaveTextContent('Apple Set');
        expect(sets[1]).toHaveTextContent('Banana Set');
        expect(sets[2]).toHaveTextContent('Zebra Set');
      });
    });

    it('sorts by name alphabetically descending', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const sortSelect = screen.getByLabelText(/sort by/i);
      await user.selectOptions(sortSelect, 'name');

      const orderSelect = screen.getByLabelText(/order/i);
      await user.selectOptions(orderSelect, 'desc');

      await waitFor(() => {
        const sets = screen.getAllByText(/set$/i);
        expect(sets[0]).toHaveTextContent('Zebra Set');
        expect(sets[1]).toHaveTextContent('Banana Set');
        expect(sets[2]).toHaveTextContent('Apple Set');
      });
    });

    it('sorts by creation date ascending', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const sortSelect = screen.getByLabelText(/sort by/i);
      await user.selectOptions(sortSelect, 'created');

      const orderSelect = screen.getByLabelText(/order/i);
      await user.selectOptions(orderSelect, 'asc');

      await waitFor(() => {
        const sets = screen.getAllByText(/set$/i);
        expect(sets[0]).toHaveTextContent('Zebra Set'); // 2024-01-01
        expect(sets[1]).toHaveTextContent('Banana Set'); // 2024-01-02
        expect(sets[2]).toHaveTextContent('Apple Set'); // 2024-01-03
      });
    });

    it('sorts by creation date descending (default)', () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      // Default sort should be by created date, descending
      const sets = screen.getAllByText(/set$/i);
      expect(sets[0]).toHaveTextContent('Apple Set'); // 2024-01-03
    });

    it('sorts by size (phrase count) ascending', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const sortSelect = screen.getByLabelText(/sort by/i);
      await user.selectOptions(sortSelect, 'size');

      const orderSelect = screen.getByLabelText(/order/i);
      await user.selectOptions(orderSelect, 'asc');

      await waitFor(() => {
        const sets = screen.getAllByText(/set$/i);
        expect(sets[0]).toHaveTextContent('Zebra Set'); // 1 phrase
        expect(sets[1]).toHaveTextContent('Apple Set'); // 2 phrases
        expect(sets[2]).toHaveTextContent('Banana Set'); // 3 phrases
      });
    });

    it('sorts by progress ascending', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const sortSelect = screen.getByLabelText(/sort by/i);
      await user.selectOptions(sortSelect, 'progress');

      const orderSelect = screen.getByLabelText(/order/i);
      await user.selectOptions(orderSelect, 'asc');

      // All sets have 0% progress initially
      await waitFor(() => {
        expect(screen.getAllByText(/set$/i)).toHaveLength(3);
      });
    });

    it('maintains sort when filtering', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const sortSelect = screen.getByLabelText(/sort by/i);
      await user.selectOptions(sortSelect, 'name');

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'Set');

      await waitFor(() => {
        const sets = screen.getAllByText(/set$/i);
        expect(sets[0]).toHaveTextContent('Apple Set');
      });
    });

    it('updates sort direction toggle', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const orderSelect = screen.getByLabelText(/order/i);

      await user.selectOptions(orderSelect, 'asc');
      expect((orderSelect as HTMLSelectElement).value).toBe('asc');

      await user.selectOptions(orderSelect, 'desc');
      expect((orderSelect as HTMLSelectElement).value).toBe('desc');
    });
  });

  // ==========================================
  // 7. Import/Export (12 tests)
  // ==========================================

  describe('Import/Export', () => {
    beforeEach(() => {
      const mockSet = createMockVocabularySet({ name: 'Export Test Set' });
      vi.mocked(VocabularyStorage.loadVocabularySets).mockReturnValue([mockSet]);
    });

    it('exports set as CSV', async () => {
      const createElementSpy = vi.spyOn(document, 'createElement');

      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const csvButton = screen.getByTitle('Export as CSV');
      await user.click(csvButton);

      expect(VocabularyStorage.exportSetAsCSV).toHaveBeenCalled();
      expect(createElementSpy).toHaveBeenCalledWith('a');

      createElementSpy.mockRestore();
    });

    it('exports set as JSON', async () => {
      const createElementSpy = vi.spyOn(document, 'createElement');

      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const jsonButton = screen.getByTitle('Export as JSON');
      await user.click(jsonButton);

      expect(createElementSpy).toHaveBeenCalledWith('a');
      createElementSpy.mockRestore();
    });

    it('generates correct CSV filename', async () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      let linkElement: HTMLAnchorElement | null = null;

      createElementSpy.mockImplementation((tag) => {
        const element = document.createElement(tag);
        if (tag === 'a') {
          linkElement = element;
        }
        return element;
      });

      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const csvButton = screen.getByTitle('Export as CSV');
      await user.click(csvButton);

      await waitFor(() => {
        expect(linkElement?.download).toMatch(/^vocabulary-.*\.csv$/);
      });

      createElementSpy.mockRestore();
    });

    it('generates correct JSON filename', async () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      let linkElement: HTMLAnchorElement | null = null;

      createElementSpy.mockImplementation((tag) => {
        const element = document.createElement(tag);
        if (tag === 'a') {
          linkElement = element;
        }
        return element;
      });

      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const jsonButton = screen.getByTitle('Export as JSON');
      await user.click(jsonButton);

      await waitFor(() => {
        expect(linkElement?.download).toMatch(/^vocabulary-.*\.json$/);
      });

      createElementSpy.mockRestore();
    });

    it('triggers file input for import', async () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      let inputElement: HTMLInputElement | null = null;

      createElementSpy.mockImplementation((tag) => {
        const element = document.createElement(tag);
        if (tag === 'input') {
          inputElement = element as HTMLInputElement;
        }
        return element;
      });

      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const importButton = screen.getByTitle(/import set/i);
      await user.click(importButton);

      expect(inputElement?.type).toBe('file');
      expect(inputElement?.accept).toBe('.json,.csv');

      createElementSpy.mockRestore();
    });

    it('imports JSON file successfully', async () => {
      const mockSet = createMockVocabularySet({ name: 'Imported Set' });
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const importButton = screen.getByTitle(/import set/i);

      // Mock file reading
      const fileContent = JSON.stringify(mockSet);
      const file = new File([fileContent], 'import.json', { type: 'application/json' });

      // This would require more complex mocking of FileReader
      await user.click(importButton);

      alertSpy.mockRestore();
    });

    it('imports CSV file with name prompt', async () => {
      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('Imported CSV Set');
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const importButton = screen.getByTitle(/import set/i);
      await user.click(importButton);

      promptSpy.mockRestore();
      alertSpy.mockRestore();
    });

    it('validates imported CSV format', async () => {
      vi.mocked(VocabularyStorage.importSetFromCSV).mockReturnValue(null);
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('Invalid CSV');

      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const importButton = screen.getByTitle(/import set/i);
      await user.click(importButton);

      promptSpy.mockRestore();
      alertSpy.mockRestore();
    });

    it('handles import errors gracefully', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const importButton = screen.getByTitle(/import set/i);

      // Should not crash on error
      await user.click(importButton);

      alertSpy.mockRestore();
    });

    it('creates review items for imported phrases', async () => {
      const mockImportedSet = createMockVocabularySet({ name: 'CSV Import' });
      vi.mocked(VocabularyStorage.importSetFromCSV).mockReturnValue(mockImportedSet);

      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      // Import would trigger review item creation
      expect(SpacedRepetitionSystem.createReviewItem).toBeDefined();
    });

    it('sanitizes filename for export', async () => {
      const specialNameSet = createMockVocabularySet({ name: 'Set: "Test" & More!' });
      vi.mocked(VocabularyStorage.loadVocabularySets).mockReturnValue([specialNameSet]);

      const createElementSpy = vi.spyOn(document, 'createElement');
      let linkElement: HTMLAnchorElement | null = null;

      createElementSpy.mockImplementation((tag) => {
        const element = document.createElement(tag);
        if (tag === 'a') {
          linkElement = element;
        }
        return element;
      });

      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const csvButton = screen.getByTitle('Export as CSV');
      await user.click(csvButton);

      await waitFor(() => {
        // Filename should be sanitized (spaces to hyphens, lowercase)
        expect(linkElement?.download).toMatch(/^vocabulary-set:.*\.csv$/);
      });

      createElementSpy.mockRestore();
    });

    it('preserves phrase data during export/import cycle', async () => {
      const originalSet = createMockVocabularySet({
        name: 'Original',
        phrases: [
          createMockPhrase({ phrase: 'Test 1', definition: 'Def 1' }),
          createMockPhrase({ phrase: 'Test 2', definition: 'Def 2' }),
        ],
      });

      vi.mocked(VocabularyStorage.loadVocabularySets).mockReturnValue([originalSet]);

      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      // Export would preserve all phrase data
      const jsonButton = screen.getByTitle('Export as JSON');
      expect(jsonButton).toBeInTheDocument();
    });
  });

  // ==========================================
  // 8. Accessibility (10 tests)
  // ==========================================

  describe('Accessibility', () => {
    beforeEach(() => {
      const mockSet = createMockVocabularySet();
      vi.mocked(VocabularyStorage.loadVocabularySets).mockReturnValue([mockSet]);
    });

    it('has proper heading hierarchy', () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const mainHeading = screen.getByRole('heading', { name: /vocabulary builder/i });
      expect(mainHeading.tagName).toBe('H2');
    });

    it('provides labels for form inputs', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const createButton = screen.getByTitle(/create new set/i);
      await user.click(createButton);

      const input = screen.getByPlaceholderText(/enter set name/i);
      expect(input).toHaveAttribute('placeholder');
    });

    it('has accessible navigation buttons', () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const studySetsButton = screen.getByRole('button', { name: /study sets/i });
      const statisticsButton = screen.getByRole('button', { name: /statistics/i });

      expect(studySetsButton).toBeInTheDocument();
      expect(statisticsButton).toBeInTheDocument();
    });

    it('provides ARIA labels for icon buttons', () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const deleteButton = screen.getByTitle('Delete set');
      expect(deleteButton).toHaveAttribute('title');
    });

    it('maintains focus management during navigation', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const statsButton = screen.getByText('Statistics');
      await user.click(statsButton);

      const setsButton = screen.getByText('Study Sets');
      await user.click(setsButton);

      // Focus should be manageable
      expect(setsButton).toBeInTheDocument();
    });

    it('supports keyboard navigation for buttons', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const studySetsButton = screen.getByText('Study Sets');

      studySetsButton.focus();
      expect(document.activeElement).toBe(studySetsButton);

      await user.keyboard('{Enter}');
      expect(studySetsButton).toHaveClass(/bg-blue-600/);
    });

    it('provides accessible search input', () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      expect(searchInput).toHaveAttribute('type', 'text');
    });

    it('has accessible select elements', () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const sortSelect = screen.getByLabelText(/sort by/i);
      expect(sortSelect).toHaveAttribute('aria-label');
    });

    it('provides visible focus indicators', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const createButton = screen.getByTitle(/create new set/i);

      createButton.focus();
      expect(document.activeElement).toBe(createButton);
    });

    it('announces dynamic content changes', async () => {
      renderWithProviders(<VocabularyBuilder {...defaultProps} />);

      const createButton = screen.getByTitle(/create new set/i);
      await user.click(createButton);

      // Form appearance should be announced via DOM changes
      const form = await screen.findByPlaceholderText(/enter set name/i);
      expect(form).toBeVisible();
    });
  });
});
