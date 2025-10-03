import { render, screen, fireEvent } from '@testing-library/react';
import { VocabularyForm } from '@/components/VocabularyBuilder/VocabularyForm';
import { vi } from 'vitest';

const defaultProps = {
  show: true,
  newSetName: 'Test Set',
  savedPhrasesCount: 5,
  onSetNameChange: vi.fn(),
  onCreateSet: vi.fn(),
  onCancel: vi.fn(),
};

describe('VocabularyForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form when show is true', () => {
    render(<VocabularyForm {...defaultProps} />);
    
    expect(screen.getByText('Create New Study Set')).toBeInTheDocument();
    expect(screen.getByLabelText('Set Name')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Set')).toBeInTheDocument();
    expect(screen.getByText('Create Set (5 phrases)')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('returns null when show is false', () => {
    const { container } = render(<VocabularyForm {...defaultProps} show={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('calls onSetNameChange when input value changes', () => {
    render(<VocabularyForm {...defaultProps} />);
    
    const input = screen.getByLabelText('Set Name');
    fireEvent.change(input, { target: { value: 'New Test Set' } });
    
    expect(defaultProps.onSetNameChange).toHaveBeenCalledWith('New Test Set');
  });

  it('calls onCreateSet when create button is clicked', () => {
    render(<VocabularyForm {...defaultProps} />);
    
    const createButton = screen.getByText('Create Set (5 phrases)');
    fireEvent.click(createButton);
    
    expect(defaultProps.onCreateSet).toHaveBeenCalled();
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<VocabularyForm {...defaultProps} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('disables create button when newSetName is empty', () => {
    render(<VocabularyForm {...defaultProps} newSetName="" />);
    
    const createButton = screen.getByText('Create Set (5 phrases)');
    expect(createButton).toBeDisabled();
  });

  it('enables create button when newSetName has content', () => {
    render(<VocabularyForm {...defaultProps} newSetName="Valid Name" />);
    
    const createButton = screen.getByText('Create Set (5 phrases)');
    expect(createButton).not.toBeDisabled();
  });

  it('displays correct phrase count', () => {
    render(<VocabularyForm {...defaultProps} savedPhrasesCount={10} />);
    
    expect(screen.getByText('Create Set (10 phrases)')).toBeInTheDocument();
  });

  it('has proper input placeholder', () => {
    render(<VocabularyForm {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Enter study set name...');
    expect(input).toBeInTheDocument();
  });
});