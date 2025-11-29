import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VocabularyActions } from '@/components/VocabularyBuilder/VocabularyActions';
import { CategorizedPhrase } from '@/types/api';

const mockSavedPhrases: CategorizedPhrase[] = [
  {
    id: '1',
    phrase: 'Test phrase',
    definition: 'Test definition',
    category: 'test',
    difficulty: 'intermediate',
  },
];

const defaultProps = {
  savedPhrases: mockSavedPhrases,
  showCreateSet: false,
  viewMode: { current: 'sets' as const },
  onImportSet: vi.fn(),
  onShowCreateSet: vi.fn(),
};

describe('VocabularyActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders import button', () => {
    render(<VocabularyActions {...defaultProps} />);
    
    const importButton = screen.getByTitle('Import vocabulary set');
    expect(importButton).toBeInTheDocument();
    
    fireEvent.click(importButton);
    expect(defaultProps.onImportSet).toHaveBeenCalled();
  });

  it('renders create set button when conditions are met', () => {
    render(<VocabularyActions {...defaultProps} />);
    
    const createSetButton = screen.getByText('Create Study Set');
    expect(createSetButton).toBeInTheDocument();
    
    fireEvent.click(createSetButton);
    expect(defaultProps.onShowCreateSet).toHaveBeenCalled();
  });

  it('does not render create set button when no saved phrases', () => {
    render(<VocabularyActions {...defaultProps} savedPhrases={[]} />);
    
    expect(screen.queryByText('Create Study Set')).not.toBeInTheDocument();
  });

  it('does not render create set button when showCreateSet is true', () => {
    render(<VocabularyActions {...defaultProps} showCreateSet={true} />);
    
    expect(screen.queryByText('Create Study Set')).not.toBeInTheDocument();
  });

  it('does not render create set button when not on sets view', () => {
    render(<VocabularyActions {...defaultProps} viewMode={{ current: 'statistics' }} />);
    
    expect(screen.queryByText('Create Study Set')).not.toBeInTheDocument();
  });

  it('always renders import button regardless of conditions', () => {
    const { rerender } = render(
      <VocabularyActions 
        {...defaultProps} 
        savedPhrases={[]} 
        showCreateSet={true}
        viewMode={{ current: 'statistics' }}
      />
    );
    
    expect(screen.getByTitle('Import vocabulary set')).toBeInTheDocument();
    
    rerender(<VocabularyActions {...defaultProps} />);
    expect(screen.getByTitle('Import vocabulary set')).toBeInTheDocument();
  });
});