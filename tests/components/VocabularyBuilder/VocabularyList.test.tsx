import { render, screen, fireEvent } from '@testing-library/react';
import { VocabularyList } from '@/components/VocabularyBuilder/VocabularyList';
import { VocabularySet, ReviewItem, StudyStatistics } from '@/types/api';

const mockVocabularySet: VocabularySet = {
  id: 'test-set-1',
  name: 'Test Set',
  description: 'A test vocabulary set',
  phrases: [
    {
      id: 'phrase-1',
      phrase: 'Test phrase',
      definition: 'Test definition',
      category: 'test',
      difficulty: 'intermediate',
      savedAt: new Date(),
      studyProgress: {
        correctAnswers: 5,
        totalAttempts: 10,
      },
    },
  ],
  createdAt: new Date('2023-01-01'),
  lastModified: new Date('2023-01-01'),
  studyStats: {
    totalPhrases: 1,
    masteredPhrases: 0,
    reviewsDue: 1,
    averageProgress: 50,
  },
};

const mockReviewItems: ReviewItem[] = [
  {
    id: 'phrase-1',
    phrase: 'Test phrase',
    definition: 'Test definition',
    interval: 1,
    repetition: 0,
    easeFactor: 2.5,
    nextReview: new Date(),
    lastReviewed: new Date(),
    quality: 0,
  },
];

const mockStatistics: StudyStatistics = {
  totalReviews: 10,
  correctReviews: 7,
  averageQuality: 3.5,
  studyStreak: 5,
  masteredItems: 3,
  itemsToReview: 2,
  estimatedTime: 10,
};

const defaultProps = {
  vocabularySets: [mockVocabularySet],
  reviewItems: mockReviewItems,
  statistics: mockStatistics,
  onStartStudySession: jest.fn(),
  onExportSet: jest.fn(),
  onDeleteSet: jest.fn(),
  calculateProgress: jest.fn(() => 50),
};

describe('VocabularyList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders vocabulary sets correctly', () => {
    render(<VocabularyList {...defaultProps} />);
    
    expect(screen.getByText('My Study Sets')).toBeInTheDocument();
    expect(screen.getByText('Test Set')).toBeInTheDocument();
    expect(screen.getByText('A test vocabulary set')).toBeInTheDocument();
    expect(screen.getByText('1 phrases')).toBeInTheDocument();
    expect(screen.getByText('Progress: 50%')).toBeInTheDocument();
  });

  it('displays items due for review', () => {
    render(<VocabularyList {...defaultProps} />);
    
    expect(screen.getByText('2 items due for review')).toBeInTheDocument();
    expect(screen.getByText('1 due for review')).toBeInTheDocument();
  });

  it('calls onStartStudySession when study buttons are clicked', () => {
    render(<VocabularyList {...defaultProps} />);
    
    const flashcardsButton = screen.getByText('Flashcards');
    const quizButton = screen.getByText('Quiz');
    const reviewButton = screen.getByText(/Review/);
    
    fireEvent.click(flashcardsButton);
    expect(defaultProps.onStartStudySession).toHaveBeenCalledWith('flashcards', 'test-set-1');
    
    fireEvent.click(quizButton);
    expect(defaultProps.onStartStudySession).toHaveBeenCalledWith('quiz', 'test-set-1');
    
    fireEvent.click(reviewButton);
    expect(defaultProps.onStartStudySession).toHaveBeenCalledWith('review', 'test-set-1');
  });

  it('calls onExportSet when export buttons are clicked', () => {
    render(<VocabularyList {...defaultProps} />);
    
    const csvExportButton = screen.getByTitle('Export as CSV');
    const jsonExportButton = screen.getByTitle('Export as JSON');
    
    fireEvent.click(csvExportButton);
    expect(defaultProps.onExportSet).toHaveBeenCalledWith(mockVocabularySet, 'csv');
    
    fireEvent.click(jsonExportButton);
    expect(defaultProps.onExportSet).toHaveBeenCalledWith(mockVocabularySet, 'json');
  });

  it('calls onDeleteSet with confirmation when delete button is clicked', () => {
    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = jest.fn(() => true);
    
    render(<VocabularyList {...defaultProps} />);
    
    const deleteButton = screen.getByTitle('Delete set');
    fireEvent.click(deleteButton);
    
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this set?');
    expect(defaultProps.onDeleteSet).toHaveBeenCalledWith('test-set-1');
    
    // Restore original confirm
    window.confirm = originalConfirm;
  });

  it('does not call onDeleteSet when confirmation is cancelled', () => {
    // Mock window.confirm to return false
    const originalConfirm = window.confirm;
    window.confirm = jest.fn(() => false);
    
    render(<VocabularyList {...defaultProps} />);
    
    const deleteButton = screen.getByTitle('Delete set');
    fireEvent.click(deleteButton);
    
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this set?');
    expect(defaultProps.onDeleteSet).not.toHaveBeenCalled();
    
    // Restore original confirm
    window.confirm = originalConfirm;
  });

  it('returns null when no vocabulary sets are provided', () => {
    const { container } = render(<VocabularyList {...defaultProps} vocabularySets={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('calls calculateProgress for each set', () => {
    render(<VocabularyList {...defaultProps} />);
    expect(defaultProps.calculateProgress).toHaveBeenCalledWith(mockVocabularySet);
  });
});