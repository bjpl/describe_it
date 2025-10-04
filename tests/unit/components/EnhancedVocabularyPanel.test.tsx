import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../utils/test-utils';
import { mockImage, mockVocabulary } from '../../utils/test-utils';
import EnhancedVocabularyPanel from '@/components/EnhancedVocabularyPanel';
import { PhraseExtractor } from '@/lib/services/phraseExtractor';
import { VocabularyManager } from '@/lib/services/vocabularyManager';

// Mock the services
vi.mock('@/lib/services/phraseExtractor');
vi.mock('@/lib/services/vocabularyManager');
vi.mock('@/components/GammaVocabularyExtractor', () => ({
  default: ({ onPhrasesUpdated, selectedImage, descriptionText }: any) => (
    <div data-testid="gamma-vocabulary-extractor">
      <button 
        onClick={() => onPhrasesUpdated([
          { id: '1', phrase: 'test phrase', category: 'sustantivos', difficulty: 'beginner' }
        ])}
        data-testid="mock-extract-button"
      >
        Extract Phrases
      </button>
      <div data-testid="selected-image">{selectedImage?.id}</div>
      <div data-testid="description-text">{descriptionText}</div>
    </div>
  )
}));

const MockedPhraseExtractor = vi.mocked(PhraseExtractor);
const MockedVocabularyManager = vi.mocked(VocabularyManager);

const defaultProps = {
  selectedImage: mockImage(),
  descriptionText: 'Una hermosa imagen de un paisaje montañoso con árboles verdes.',
  style: 'narrativo' as const,
  activeDescriptionTab: 'current',
  onTabChange: vi.fn(),
  allDescriptions: {
    current: 'Una hermosa imagen de un paisaje montañoso con árboles verdes.',
    alternative: 'Un paisaje impresionante con montañas y vegetación.'
  }
};

const mockVocabularyManagerInstance = {
  getVocabularyStats: vi.fn(),
  addMultiplePhrases: vi.fn(),
  downloadTargetWordList: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

const mockPhraseCategories = [
  {
    name: 'sustantivos',
    displayName: 'Sustantivos',
    color: 'bg-blue-100 text-blue-800',
    description: 'Nouns'
  },
  {
    name: 'verbos',
    displayName: 'Verbos',
    color: 'bg-green-100 text-green-800',
    description: 'Verbs'
  },
  {
    name: 'adjetivos',
    displayName: 'Adjetivos',
    color: 'bg-yellow-100 text-yellow-800',
    description: 'Adjectives'
  }
];

describe('EnhancedVocabularyPanel', () => {
  beforeEach(() => {
    // Mock VocabularyManager constructor
    MockedVocabularyManager.mockImplementation(() => mockVocabularyManagerInstance as any);
    
    // Mock PhraseExtractor static methods
    MockedPhraseExtractor.extractCategorizedPhrases = vi.fn().mockResolvedValue({
      sustantivos: [{ id: '1', phrase: 'paisaje', category: 'sustantivos', difficulty: 'beginner' }],
      verbos: [{ id: '2', phrase: 'observar', category: 'verbos', difficulty: 'intermediate' }],
    });
    
    MockedPhraseExtractor.getAllCategories = vi.fn().mockReturnValue(mockPhraseCategories);
    
    // Mock vocabulary stats
    mockVocabularyManagerInstance.getVocabularyStats.mockReturnValue({
      totalPhrases: 15,
      categoryCounts: {
        sustantivos: 5,
        verbos: 4,
        adjetivos: 3,
        adverbios: 2,
        frasesClaves: 1,
      },
      difficultyDistribution: {
        beginner: 8,
        intermediate: 5,
        advanced: 2,
      }
    });

    // Mock localStorage for sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        setItem: vi.fn(),
        getItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });

    // Mock custom events
    window.dispatchEvent = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render with selected image', () => {
      render(<EnhancedVocabularyPanel {...defaultProps} />);

      expect(screen.getByText('Vocabulary Extractor')).toBeInTheDocument();
      expect(screen.getByText('Agent Gamma-3')).toBeInTheDocument();
      expect(screen.getByText('15 phrases saved')).toBeInTheDocument();
    });

    it('should show empty state when no image is selected', () => {
      render(<EnhancedVocabularyPanel {...defaultProps} selectedImage={null} />);

      expect(screen.getByText('Select an image to start vocabulary extraction.')).toBeInTheDocument();
    });

    it('should display vocabulary statistics correctly', () => {
      render(<EnhancedVocabularyPanel {...defaultProps} />);

      expect(screen.getByText('15 phrases saved')).toBeInTheDocument();
      expect(screen.getByText('3 categories')).toBeInTheDocument();
    });

    it('should render category statistics', () => {
      render(<EnhancedVocabularyPanel {...defaultProps} />);

      // Should show category counts
      expect(screen.getByText('5')).toBeInTheDocument(); // sustantivos count
      expect(screen.getByText('4')).toBeInTheDocument(); // verbos count
      expect(screen.getByText('3')).toBeInTheDocument(); // adjetivos count
    });
  });

  describe('Navigation and Views', () => {
    it('should switch between extractor and builder views', async () => {
      const { user } = render(<EnhancedVocabularyPanel {...defaultProps} />);

      // Should start on extractor view
      expect(screen.getByTestId('gamma-vocabulary-extractor')).toBeInTheDocument();

      // Switch to builder view
      const builderButton = screen.getByText('Builder');
      await user.click(builderButton);

      expect(screen.getByText('Vocabulary Builder integration coming soon.')).toBeInTheDocument();
    });

    it('should highlight active view button', async () => {
      const { user } = render(<EnhancedVocabularyPanel {...defaultProps} />);

      const extractButton = screen.getByText('Extract');
      const builderButton = screen.getByText('Builder');

      // Extract should be active by default
      expect(extractButton).toHaveClass('bg-white');
      expect(builderButton).not.toHaveClass('bg-white');

      // Switch to builder
      await user.click(builderButton);

      expect(builderButton).toHaveClass('bg-white');
      expect(extractButton).not.toHaveClass('bg-white');
    });
  });

  describe('Settings Panel', () => {
    it('should toggle settings panel', async () => {
      const { user } = render(<EnhancedVocabularyPanel {...defaultProps} />);

      const settingsButton = screen.getByTitle('Settings');
      await user.click(settingsButton);

      expect(screen.getByText('Extraction Settings')).toBeInTheDocument();
      expect(screen.getByText('Preferred Difficulty')).toBeInTheDocument();
      expect(screen.getByText('Max Phrases Per Extraction')).toBeInTheDocument();
    });

    it('should update difficulty setting', async () => {
      const { user } = render(<EnhancedVocabularyPanel {...defaultProps} />);

      // Open settings
      const settingsButton = screen.getByTitle('Settings');
      await user.click(settingsButton);

      // Change difficulty
      const difficultySelect = screen.getByRole('combobox', { name: /preferred difficulty/i });
      await user.selectOptions(difficultySelect, 'advanced');

      expect(difficultySelect).toHaveValue('advanced');
    });

    it('should update max phrases setting', async () => {
      const { user } = render(<EnhancedVocabularyPanel {...defaultProps} />);

      // Open settings
      const settingsButton = screen.getByTitle('Settings');
      await user.click(settingsButton);

      // Change max phrases
      const maxPhrasesSelect = screen.getByRole('combobox', { name: /max phrases/i });
      await user.selectOptions(maxPhrasesSelect, '20');

      expect(maxPhrasesSelect).toHaveValue('20');
    });

    it('should toggle auto-extract setting', async () => {
      const { user } = render(<EnhancedVocabularyPanel {...defaultProps} />);

      // Open settings
      const settingsButton = screen.getByTitle('Settings');
      await user.click(settingsButton);

      // Toggle auto-extract
      const autoExtractCheckbox = screen.getByLabelText(/auto-extract when description changes/i);
      expect(autoExtractCheckbox).toBeChecked();

      await user.click(autoExtractCheckbox);
      expect(autoExtractCheckbox).not.toBeChecked();
    });

    it('should toggle coordination setting', async () => {
      const { user } = render(<EnhancedVocabularyPanel {...defaultProps} />);

      // Open settings
      const settingsButton = screen.getByTitle('Settings');
      await user.click(settingsButton);

      // Toggle coordination
      const coordinationCheckbox = screen.getByLabelText(/coordinate with alpha-1/i);
      expect(coordinationCheckbox).toBeChecked();

      await user.click(coordinationCheckbox);
      expect(coordinationCheckbox).not.toBeChecked();
    });
  });

  describe('Quick Actions', () => {
    it('should perform quick extract from description', async () => {
      const { user } = render(<EnhancedVocabularyPanel {...defaultProps} />);

      const quickExtractButton = screen.getByTitle('Quick extract from current description');
      await user.click(quickExtractButton);

      expect(MockedPhraseExtractor.extractCategorizedPhrases).toHaveBeenCalledWith({
        description: defaultProps.descriptionText,
        imageUrl: defaultProps.selectedImage.urls.regular,
        targetLevel: 'intermediate',
        maxPhrases: 15,
        categories: expect.arrayContaining(['sustantivos', 'verbos', 'adjetivos', 'adverbios', 'frasesClaves'])
      });
    });

    it('should export vocabulary as CSV', async () => {
      const { user } = render(<EnhancedVocabularyPanel {...defaultProps} />);

      const exportButton = screen.getByTitle('Export target_word_list.csv');
      await user.click(exportButton);

      expect(mockVocabularyManagerInstance.downloadTargetWordList).toHaveBeenCalled();
    });

    it('should disable quick extract when no description', () => {
      render(
        <EnhancedVocabularyPanel 
          {...defaultProps} 
          descriptionText={null}
        />
      );

      const quickExtractButton = screen.getByTitle('Quick extract from current description');
      expect(quickExtractButton).toBeDisabled();
    });

    it('should disable export when no phrases', () => {
      mockVocabularyManagerInstance.getVocabularyStats.mockReturnValue({
        totalPhrases: 0,
        categoryCounts: {},
        difficultyDistribution: {}
      });

      render(<EnhancedVocabularyPanel {...defaultProps} />);

      const exportButton = screen.getByTitle('Export target_word_list.csv');
      expect(exportButton).toBeDisabled();
    });
  });

  describe('Alpha-1 Coordination', () => {
    it('should show coordination status when enabled', () => {
      render(<EnhancedVocabularyPanel {...defaultProps} />);

      expect(screen.getByText('Coordinating with Alpha-1 description tabs')).toBeInTheDocument();
      expect(screen.getByText('Active: current')).toBeInTheDocument();
    });

    it('should use description from active tab', () => {
      render(
        <EnhancedVocabularyPanel 
          {...defaultProps}
          activeDescriptionTab="alternative"
        />
      );

      expect(screen.getByTestId('description-text')).toHaveTextContent(
        defaultProps.allDescriptions.alternative
      );
    });

    it('should store coordination data in sessionStorage', () => {
      render(<EnhancedVocabularyPanel {...defaultProps} />);

      expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
        'gamma3-coordination',
        expect.stringContaining('gamma-3')
      );
    });
  });

  describe('Phrases Update Handling', () => {
    it('should handle phrases updated from extractor', async () => {
      const { user } = render(<EnhancedVocabularyPanel {...defaultProps} />);

      const mockExtractButton = screen.getByTestId('mock-extract-button');
      await user.click(mockExtractButton);

      // Should store extraction event
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
        'gamma3-latest-extraction',
        expect.stringContaining('phrases-extracted')
      );

      // Should dispatch custom event
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'vocabularyExtracted'
        })
      );
    });

    it('should show recent extractions', async () => {
      const { user } = render(<EnhancedVocabularyPanel {...defaultProps} />);

      const mockExtractButton = screen.getByTestId('mock-extract-button');
      await user.click(mockExtractButton);

      await waitFor(() => {
        expect(screen.getByText('Recent Extractions (1)')).toBeInTheDocument();
        expect(screen.getByText('test phrase')).toBeInTheDocument();
      });
    });

    it('should auto-add phrases when count is small', async () => {
      mockVocabularyManagerInstance.addMultiplePhrases.mockResolvedValue([
        { id: '1', phrase: 'test', added: true }
      ]);

      const { user } = render(<EnhancedVocabularyPanel {...defaultProps} />);

      const quickExtractButton = screen.getByTitle('Quick extract from current description');
      await user.click(quickExtractButton);

      // Mock small result set
      MockedPhraseExtractor.extractCategorizedPhrases.mockResolvedValueOnce({
        sustantivos: [{ id: '1', phrase: 'test', category: 'sustantivos', difficulty: 'beginner' }]
      });

      await waitFor(() => {
        expect(mockVocabularyManagerInstance.addMultiplePhrases).toHaveBeenCalled();
      });
    });
  });

  describe('Category Statistics Display', () => {
    it('should calculate category percentages correctly', () => {
      render(<EnhancedVocabularyPanel {...defaultProps} />);

      // With 15 total phrases and 5 sustantivos, percentage should be 33%
      expect(screen.getByText('33%')).toBeInTheDocument();
    });

    it('should handle zero total phrases', () => {
      mockVocabularyManagerInstance.getVocabularyStats.mockReturnValue({
        totalPhrases: 0,
        categoryCounts: {},
        difficultyDistribution: {}
      });

      render(<EnhancedVocabularyPanel {...defaultProps} />);

      expect(screen.getByText('0 phrases saved')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle extraction errors gracefully', async () => {
      MockedPhraseExtractor.extractCategorizedPhrases.mockRejectedValueOnce(
        new Error('API Error')
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { user } = render(<EnhancedVocabularyPanel {...defaultProps} />);

      const quickExtractButton = screen.getByTitle('Quick extract from current description');
      await user.click(quickExtractButton);

      expect(consoleSpy).toHaveBeenCalledWith('Quick extraction error:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle export errors gracefully', async () => {
      mockVocabularyManagerInstance.downloadTargetWordList.mockRejectedValueOnce(
        new Error('Export Error')
      );

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { user } = render(<EnhancedVocabularyPanel {...defaultProps} />);

      const exportButton = screen.getByTitle('Export target_word_list.csv');
      await user.click(exportButton);

      expect(consoleSpy).toHaveBeenCalledWith('Export error:', expect.any(Error));
      expect(alertSpy).toHaveBeenCalledWith('Error exporting vocabulary. Please try again.');
      
      alertSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it('should handle vocabulary stats loading errors', () => {
      mockVocabularyManagerInstance.getVocabularyStats.mockImplementation(() => {
        throw new Error('Stats error');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<EnhancedVocabularyPanel {...defaultProps} />);

      expect(consoleSpy).toHaveBeenCalledWith('Error loading vocabulary stats:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    it('should render within performance threshold', () => {
      const startTime = performance.now();
      render(<EnhancedVocabularyPanel {...defaultProps} />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle large vocabulary sets efficiently', () => {
      mockVocabularyManagerInstance.getVocabularyStats.mockReturnValue({
        totalPhrases: 1000,
        categoryCounts: {
          sustantivos: 500,
          verbos: 300,
          adjetivos: 200,
        },
        difficultyDistribution: {
          beginner: 400,
          intermediate: 400,
          advanced: 200,
        }
      });

      render(<EnhancedVocabularyPanel {...defaultProps} />);

      expect(screen.getByText('1000 phrases saved')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button labels', () => {
      render(<EnhancedVocabularyPanel {...defaultProps} />);

      expect(screen.getByTitle('Quick extract from current description')).toBeInTheDocument();
      expect(screen.getByTitle('Export target_word_list.csv')).toBeInTheDocument();
      expect(screen.getByTitle('Settings')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const { user } = render(<EnhancedVocabularyPanel {...defaultProps} />);

      await user.keyboard('{Tab}');
      expect(screen.getByText('Extract')).toHaveFocus();

      await user.keyboard('{Tab}');
      expect(screen.getByText('Builder')).toHaveFocus();
    });

    it('should have proper form labels in settings', async () => {
      const { user } = render(<EnhancedVocabularyPanel {...defaultProps} />);

      const settingsButton = screen.getByTitle('Settings');
      await user.click(settingsButton);

      expect(screen.getByLabelText(/preferred difficulty/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/max phrases per extraction/i)).toBeInTheDocument();
    });
  });
});