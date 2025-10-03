import { render, screen, fireEvent } from '@testing-library/react';
import { VocabularyFilters } from '@/components/VocabularyBuilder/VocabularyFilters';
import { VocabularySet } from '@/types/api';

const mockVocabularySets: VocabularySet[] = [
  {
    id: 'set-1',
    name: 'First Set',
    description: 'First test set',
    phrases: [],
    createdAt: new Date('2023-01-01'),
    lastModified: new Date('2023-01-01'),
    studyStats: {
      totalPhrases: 0,
      masteredPhrases: 0,
      reviewsDue: 0,
      averageProgress: 0,
    },
  },
  {
    id: 'set-2',
    name: 'Second Set',
    description: 'Second test set',
    phrases: [],
    createdAt: new Date('2023-02-01'),
    lastModified: new Date('2023-02-01'),
    studyStats: {
      totalPhrases: 0,
      masteredPhrases: 0,
      reviewsDue: 0,
      averageProgress: 0,
    },
  },
];

const defaultProps = {
  vocabularySets: mockVocabularySets,
  searchTerm: '',
  sortBy: 'created' as const,
  sortOrder: 'desc' as const,
  onSearchChange: jest.fn(),
  onSortChange: jest.fn(),
};

describe('VocabularyFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search input and sort dropdown', () => {
    render(<VocabularyFilters {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search vocabulary sets...');
    const sortDropdown = screen.getByDisplayValue('Newest First');
    
    expect(searchInput).toBeInTheDocument();
    expect(sortDropdown).toBeInTheDocument();
  });

  it('calls onSearchChange when search input changes', () => {
    render(<VocabularyFilters {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search vocabulary sets...');
    fireEvent.change(searchInput, { target: { value: 'test search' } });
    
    expect(defaultProps.onSearchChange).toHaveBeenCalledWith('test search');
  });

  it('calls onSortChange when sort dropdown changes', () => {
    render(<VocabularyFilters {...defaultProps} />);
    
    const sortDropdown = screen.getByDisplayValue('Newest First');
    fireEvent.change(sortDropdown, { target: { value: 'name-asc' } });
    
    expect(defaultProps.onSortChange).toHaveBeenCalledWith('name', 'asc');
  });

  it('displays current search term', () => {
    render(<VocabularyFilters {...defaultProps} searchTerm="test query" />);
    
    const searchInput = screen.getByDisplayValue('test query');
    expect(searchInput).toBeInTheDocument();
  });

  it('displays correct sort option', () => {
    render(
      <VocabularyFilters 
        {...defaultProps} 
        sortBy="name" 
        sortOrder="asc" 
      />
    );
    
    const sortDropdown = screen.getByDisplayValue('Name (A-Z)');
    expect(sortDropdown).toBeInTheDocument();
  });

  it('returns null when no vocabulary sets exist', () => {
    const { container } = render(
      <VocabularyFilters {...defaultProps} vocabularySets={[]} />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('contains all sort options', () => {
    render(<VocabularyFilters {...defaultProps} />);
    
    const sortDropdown = screen.getByRole('combobox');
    
    expect(screen.getByText('Name (A-Z)')).toBeInTheDocument();
    expect(screen.getByText('Name (Z-A)')).toBeInTheDocument();
    expect(screen.getByText('Newest First')).toBeInTheDocument();
    expect(screen.getByText('Oldest First')).toBeInTheDocument();
    expect(screen.getByText('Highest Progress')).toBeInTheDocument();
    expect(screen.getByText('Lowest Progress')).toBeInTheDocument();
    expect(screen.getByText('Largest Sets')).toBeInTheDocument();
    expect(screen.getByText('Smallest Sets')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<VocabularyFilters {...defaultProps} />);
    
    const searchInput = screen.getByRole('textbox');
    const sortSelect = screen.getByRole('combobox');
    
    expect(searchInput).toBeInTheDocument();
    expect(sortSelect).toBeInTheDocument();
  });
});