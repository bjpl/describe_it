import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VocabularyBuilder from '@/components/VocabularyBuilder';
import { CategorizedPhrase } from '@/types/api';

// Mock the storage and algorithms
jest.mock('@/lib/storage/vocabularyStorage', () => ({
  loadVocabularySets: jest.fn(() => []),
  loadReviewItems: jest.fn(() => []),
  getStudyHistory: jest.fn(() => []),
  saveVocabularySets: jest.fn(),
  saveReviewItems: jest.fn(),
  addStudySession: jest.fn(),
  deleteVocabularySet: jest.fn(),
  exportSetAsCSV: jest.fn(() => 'csv,data'),
  importSetFromCSV: jest.fn(),
}));

jest.mock('@/lib/algorithms/spacedRepetition', () => ({
  calculateStatistics: jest.fn(() => ({
    totalReviews: 0,
    correctReviews: 0,
    averageQuality: 0,
    studyStreak: 0,
    masteredItems: 0,
    itemsToReview: 0,
    estimatedTime: 0,
  })),
  createReviewItem: jest.fn((id, phrase, definition) => ({
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
  getItemsDueForReview: jest.fn(() => []),
  calculateNextReview: jest.fn((item, quality) => ({ ...item, quality })),
  responseToQuality: jest.fn(() => 3),
}));

// Mock FlashcardComponent and QuizComponent
jest.mock('@/components/FlashcardComponent', () => {
  return function MockFlashcardComponent({ onAnswer, onNext, onPrevious }: any) {
    return (
      <div data-testid="flashcard-component">
        <button onClick={() => onAnswer(4)}>Good Answer</button>
        <button onClick={onNext}>Next</button>
        <button onClick={onPrevious}>Previous</button>
      </div>
    );
  };
});

jest.mock('@/components/QuizComponent', () => {
  return function MockQuizComponent({ onComplete }: any) {
    return (
      <div data-testid="quiz-component">
        <button 
          onClick={() => onComplete({
            totalQuestions: 5,
            correctAnswers: 4,
            accuracy: 80,
            questionsWithAnswers: []
          })}
        >
          Complete Quiz
        </button>
      </div>
    );
  };
});

jest.mock('@/components/ProgressStatistics', () => {
  return function MockProgressStatistics() {
    return <div data-testid="progress-statistics">Statistics View</div>;
  };
});

const mockSavedPhrases: CategorizedPhrase[] = [
  {
    id: '1',
    phrase: 'hola',
    definition: 'hello',
    category: 'greetings',
    difficulty: 'beginner',
  },
  {
    id: '2',
    phrase: 'gracias',
    definition: 'thank you',
    category: 'politeness',
    difficulty: 'beginner',
  },
];

const defaultProps = {
  savedPhrases: mockSavedPhrases,
  onUpdatePhrases: jest.fn(),
};

describe('VocabularyBuilder Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders main header and navigation', () => {
    render(<VocabularyBuilder {...defaultProps} />);
    
    expect(screen.getByText('Vocabulary Builder')).toBeInTheDocument();
    expect(screen.getByText('Study Sets')).toBeInTheDocument();
    expect(screen.getByText('Statistics')).toBeInTheDocument();
  });

  it('shows empty state when no saved phrases and no sets', () => {
    render(<VocabularyBuilder {...defaultProps} savedPhrases={[]} />);
    
    expect(screen.getByText('No saved phrases yet.')).toBeInTheDocument();
    expect(screen.getByText('Import Vocabulary Set')).toBeInTheDocument();
  });

  it('shows create set button when there are saved phrases', () => {
    render(<VocabularyBuilder {...defaultProps} />);
    
    expect(screen.getByText('Create Study Set')).toBeInTheDocument();
  });

  it('can create a new vocabulary set', async () => {
    render(<VocabularyBuilder {...defaultProps} />);
    
    // Click create set button
    const createSetButton = screen.getByText('Create Study Set');
    fireEvent.click(createSetButton);
    
    // Form should appear
    expect(screen.getByText('Create New Study Set')).toBeInTheDocument();
    
    // Enter set name
    const nameInput = screen.getByLabelText('Set Name');
    fireEvent.change(nameInput, { target: { value: 'My Test Set' } });
    
    // Click create
    const createButton = screen.getByText('Create Set (2 phrases)');
    fireEvent.click(createButton);
    
    // Form should disappear
    await waitFor(() => {
      expect(screen.queryByText('Create New Study Set')).not.toBeInTheDocument();
    });
  });

  it('can navigate between different views', () => {
    render(<VocabularyBuilder {...defaultProps} />);
    
    // Navigate to statistics
    const statisticsButton = screen.getByText('Statistics');
    fireEvent.click(statisticsButton);
    
    expect(screen.getByTestId('progress-statistics')).toBeInTheDocument();
    
    // Navigate back to sets
    const setsButton = screen.getByText('Study Sets');
    fireEvent.click(setsButton);
    
    expect(screen.queryByTestId('progress-statistics')).not.toBeInTheDocument();
  });

  it('handles import functionality', () => {
    render(<VocabularyBuilder {...defaultProps} />);
    
    const importButton = screen.getByTitle('Import vocabulary set');
    expect(importButton).toBeInTheDocument();
    
    // Note: Full file import testing would require more complex mocking
    // This test verifies the button is rendered and accessible
  });

  it('displays correct phrase count in create form', () => {
    render(<VocabularyBuilder {...defaultProps} />);
    
    const createSetButton = screen.getByText('Create Study Set');
    fireEvent.click(createSetButton);
    
    expect(screen.getByText('Create Set (2 phrases)')).toBeInTheDocument();
  });

  it('can cancel set creation', () => {
    render(<VocabularyBuilder {...defaultProps} />);
    
    // Open create form
    const createSetButton = screen.getByText('Create Study Set');
    fireEvent.click(createSetButton);
    
    expect(screen.getByText('Create New Study Set')).toBeInTheDocument();
    
    // Cancel
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(screen.queryByText('Create New Study Set')).not.toBeInTheDocument();
  });

  it('integrates with all sub-components properly', () => {
    render(<VocabularyBuilder {...defaultProps} />);
    
    // Actions component
    expect(screen.getByTitle('Import vocabulary set')).toBeInTheDocument();
    
    // Form component (when opened)
    const createSetButton = screen.getByText('Create Study Set');
    fireEvent.click(createSetButton);
    expect(screen.getByText('Create New Study Set')).toBeInTheDocument();
    
    // Cancel to close form
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    // Empty state component (with no sets and no phrases)
    const emptyProps = { ...defaultProps, savedPhrases: [] };
    const { rerender } = render(<VocabularyBuilder {...emptyProps} />);
    expect(screen.getByText('No saved phrases yet.')).toBeInTheDocument();
  });
});