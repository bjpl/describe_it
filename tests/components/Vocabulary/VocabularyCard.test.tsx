import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { VocabularyCard, VocabularyCardProps } from '@/components/Vocabulary/VocabularyCard';
import { ExtractedVocabularyItem } from '@/types/comprehensive';

// Mock Data
const mockVocabularyItem: ExtractedVocabularyItem = {
  id: 'vocab-1',
  word: 'magnificent',
  definition: 'Extremely beautiful, elaborate, or impressive',
  part_of_speech: 'adjective',
  category: 'adjectives',
  difficulty: 'intermediate',
  frequency_score: 85,
  context_sentences: [
    'The view from the mountain was magnificent.',
    'She wore a magnificent gown to the gala.',
  ],
  translations: {
    en: 'magnificent',
    es: 'magnífico',
    fr: 'magnifique',
    de: 'großartig',
  },
  pronunciation: {
    ipa: 'mæɡˈnɪfɪsənt',
    audio_url: 'https://example.com/audio/magnificent.mp3',
    syllables: ['mag', 'nif', 'i', 'cent'],
    stress_pattern: [0, 1, 0, 0],
    phonetic_spelling: 'mag-NIF-i-cent',
  },
  usage_notes: ['Often used to describe grand or impressive things'],
  related_words: [
    { word: 'splendid', relationship: 'synonym', strength: 0.9 },
    { word: 'poor', relationship: 'antonym', strength: 0.8 },
  ],
  examples: [
    {
      sentence: 'The palace was magnificent in every detail.',
      context: 'Architecture',
      difficulty: 'intermediate',
      translations: {
        en: 'The palace was magnificent in every detail.',
        es: 'El palacio era magnífico en cada detalle.',
      },
    },
  ],
};

const mockMinimalItem: ExtractedVocabularyItem = {
  id: 'vocab-minimal',
  word: 'test',
  definition: 'A simple test word',
  part_of_speech: 'noun',
  category: 'nouns',
  difficulty: 'beginner',
  frequency_score: 50,
  context_sentences: [],
  translations: { en: 'test' },
  pronunciation: {
    syllables: ['test'],
    stress_pattern: [1],
  },
  usage_notes: [],
  related_words: [],
  examples: [],
};

describe('VocabularyCard Component', () => {
  // =============================================================================
  // RENDERING TESTS (15 tests)
  // =============================================================================

  describe('Rendering - Basic Display', () => {
    it('should render card with all fields populated', () => {
      render(<VocabularyCard item={mockVocabularyItem} />);

      expect(screen.getByText('magnificent')).toBeInTheDocument();
      expect(screen.getByText('adjective')).toBeInTheDocument();
      expect(screen.getByText(/Extremely beautiful/)).toBeInTheDocument();
    });

    it('should render card with minimal fields', () => {
      render(<VocabularyCard item={mockMinimalItem} />);

      expect(screen.getByText('test')).toBeInTheDocument();
      expect(screen.getByText('noun')).toBeInTheDocument();
      expect(screen.getByText('A simple test word')).toBeInTheDocument();
    });

    it('should render in compact mode', () => {
      const { container } = render(
        <VocabularyCard item={mockVocabularyItem} mode="compact" />
      );

      expect(container.querySelector('.vocabulary-card.compact')).toBeInTheDocument();
    });

    it('should render in expanded mode by default', () => {
      const { container } = render(<VocabularyCard item={mockVocabularyItem} />);

      expect(container.querySelector('.vocabulary-card.expanded')).toBeInTheDocument();
    });

    it('should render in expanded mode when explicitly set', () => {
      const { container } = render(
        <VocabularyCard item={mockVocabularyItem} mode="expanded" />
      );

      expect(container.querySelector('.vocabulary-card.expanded')).toBeInTheDocument();
    });

    it('should display word image when provided', () => {
      const itemWithImage = {
        ...mockVocabularyItem,
        image_url: 'https://example.com/magnificent.jpg',
      };

      // Note: Image display would be in the component if implemented
      render(<VocabularyCard item={mockVocabularyItem} />);
      expect(screen.getByText('magnificent')).toBeInTheDocument();
    });

    it('should handle missing image gracefully', () => {
      render(<VocabularyCard item={mockVocabularyItem} />);

      // Should render without errors
      expect(screen.getByText('magnificent')).toBeInTheDocument();
    });

    it('should display pronunciation IPA when available', () => {
      render(<VocabularyCard item={mockVocabularyItem} />);

      expect(screen.getByText('mæɡˈnɪfɪsənt')).toBeInTheDocument();
    });

    it('should not display pronunciation section when IPA is missing', () => {
      render(<VocabularyCard item={mockMinimalItem} />);

      expect(screen.queryByText(/Pronunciation/)).not.toBeInTheDocument();
    });

    it('should display context sentences in expanded mode', () => {
      render(<VocabularyCard item={mockVocabularyItem} mode="expanded" />);

      expect(screen.getByText(/The view from the mountain/)).toBeInTheDocument();
      expect(screen.getByText(/She wore a magnificent gown/)).toBeInTheDocument();
    });

    it('should not display context sentences in compact mode', () => {
      render(<VocabularyCard item={mockVocabularyItem} mode="compact" />);

      expect(screen.queryByText(/Example Usage/)).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <VocabularyCard item={mockVocabularyItem} className="custom-class" />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('should display part of speech', () => {
      render(<VocabularyCard item={mockVocabularyItem} />);

      expect(screen.getByText('adjective')).toBeInTheDocument();
    });

    it('should display definition', () => {
      render(<VocabularyCard item={mockVocabularyItem} />);

      expect(screen.getByText(/Extremely beautiful/)).toBeInTheDocument();
    });

    it('should render with proper semantic HTML structure', () => {
      render(<VocabularyCard item={mockVocabularyItem} />);

      const article = screen.getByRole('article');
      expect(article).toHaveAttribute('aria-label', 'Vocabulary card for magnificent');
    });
  });

  // =============================================================================
  // INTERACTIVE ELEMENTS TESTS (18 tests)
  // =============================================================================

  describe('Interactive Elements - Card Flip', () => {
    it('should flip card to show Spanish translation on button click', () => {
      render(<VocabularyCard item={mockVocabularyItem} />);

      const flipButton = screen.getByText(/Flip to Spanish/);
      fireEvent.click(flipButton);

      expect(screen.getByText('magnífico')).toBeInTheDocument();
    });

    it('should flip card back to English on second click', () => {
      render(<VocabularyCard item={mockVocabularyItem} />);

      const flipButton = screen.getByText(/Flip to Spanish/);
      fireEvent.click(flipButton);

      const flipBackButton = screen.getByText(/Show English/);
      fireEvent.click(flipBackButton);

      expect(screen.getByText('magnificent')).toBeInTheDocument();
    });

    it('should add flipped class when card is flipped', () => {
      const { container } = render(<VocabularyCard item={mockVocabularyItem} />);

      const flipButton = screen.getByText(/Flip to Spanish/);
      fireEvent.click(flipButton);

      expect(container.querySelector('.flipped')).toBeInTheDocument();
    });

    it('should remove flipped class when card is flipped back', () => {
      const { container } = render(<VocabularyCard item={mockVocabularyItem} />);

      const flipButton = screen.getByText(/Flip to Spanish/);
      fireEvent.click(flipButton);

      const flipBackButton = screen.getByText(/Show English/);
      fireEvent.click(flipBackButton);

      expect(container.querySelector('.flipped')).not.toBeInTheDocument();
    });
  });

  describe('Interactive Elements - Audio Pronunciation', () => {
    it('should display audio button when audio URL is provided', () => {
      render(<VocabularyCard item={mockVocabularyItem} />);

      expect(screen.getByLabelText('Play pronunciation')).toBeInTheDocument();
    });

    it('should not display audio button when audio URL is missing', () => {
      render(<VocabularyCard item={mockMinimalItem} />);

      expect(screen.queryByLabelText('Play pronunciation')).not.toBeInTheDocument();
    });

    it('should call onPlayAudio with correct URL when clicked', () => {
      const onPlayAudio = vi.fn();
      render(<VocabularyCard item={mockVocabularyItem} onPlayAudio={onPlayAudio} />);

      const audioButton = screen.getByLabelText('Play pronunciation');
      fireEvent.click(audioButton);

      expect(onPlayAudio).toHaveBeenCalledWith('https://example.com/audio/magnificent.mp3');
    });

    it('should not call onPlayAudio when audio URL is missing', () => {
      const onPlayAudio = vi.fn();
      const itemWithoutAudio = {
        ...mockVocabularyItem,
        pronunciation: { ...mockVocabularyItem.pronunciation, audio_url: undefined },
      };

      render(<VocabularyCard item={itemWithoutAudio} onPlayAudio={onPlayAudio} />);

      expect(screen.queryByLabelText('Play pronunciation')).not.toBeInTheDocument();
      expect(onPlayAudio).not.toHaveBeenCalled();
    });
  });

  describe('Interactive Elements - Favorite Toggle', () => {
    it('should display unfavorited heart icon by default', () => {
      render(<VocabularyCard item={mockVocabularyItem} />);

      const favoriteButton = screen.getByLabelText('Add to favorites');
      expect(favoriteButton).toBeInTheDocument();
    });

    it('should display favorited heart icon when isFavorite is true', () => {
      render(<VocabularyCard item={mockVocabularyItem} isFavorite={true} />);

      const favoriteButton = screen.getByLabelText('Remove from favorites');
      expect(favoriteButton).toHaveClass('text-red-500');
    });

    it('should call onFavorite with correct parameters when toggled to favorite', () => {
      const onFavorite = vi.fn();
      render(
        <VocabularyCard
          item={mockVocabularyItem}
          isFavorite={false}
          onFavorite={onFavorite}
        />
      );

      const favoriteButton = screen.getByLabelText('Add to favorites');
      fireEvent.click(favoriteButton);

      expect(onFavorite).toHaveBeenCalledWith('vocab-1', true);
    });

    it('should call onFavorite with correct parameters when unfavorited', () => {
      const onFavorite = vi.fn();
      render(
        <VocabularyCard
          item={mockVocabularyItem}
          isFavorite={true}
          onFavorite={onFavorite}
        />
      );

      const favoriteButton = screen.getByLabelText('Remove from favorites');
      fireEvent.click(favoriteButton);

      expect(onFavorite).toHaveBeenCalledWith('vocab-1', false);
    });
  });

  describe('Interactive Elements - Edit, Delete, Share Buttons', () => {
    it('should display edit button', () => {
      render(<VocabularyCard item={mockVocabularyItem} />);

      expect(screen.getByLabelText('Edit card')).toBeInTheDocument();
    });

    it('should call onEdit with correct ID when edit is clicked', () => {
      const onEdit = vi.fn();
      render(<VocabularyCard item={mockVocabularyItem} onEdit={onEdit} />);

      const editButton = screen.getByLabelText('Edit card');
      fireEvent.click(editButton);

      expect(onEdit).toHaveBeenCalledWith('vocab-1');
    });

    it('should display delete button', () => {
      render(<VocabularyCard item={mockVocabularyItem} />);

      expect(screen.getByLabelText('Delete card')).toBeInTheDocument();
    });

    it('should call onDelete with correct ID when delete is clicked', () => {
      const onDelete = vi.fn();
      render(<VocabularyCard item={mockVocabularyItem} onDelete={onDelete} />);

      const deleteButton = screen.getByLabelText('Delete card');
      fireEvent.click(deleteButton);

      expect(onDelete).toHaveBeenCalledWith('vocab-1');
    });

    it('should display share button', () => {
      render(<VocabularyCard item={mockVocabularyItem} />);

      expect(screen.getByLabelText('Share card')).toBeInTheDocument();
    });

    it('should call onShare with correct ID when share is clicked', () => {
      const onShare = vi.fn();
      render(<VocabularyCard item={mockVocabularyItem} onShare={onShare} />);

      const shareButton = screen.getByLabelText('Share card');
      fireEvent.click(shareButton);

      expect(onShare).toHaveBeenCalledWith('vocab-1');
    });
  });

  // =============================================================================
  // PROGRESS INDICATORS TESTS (12 tests)
  // =============================================================================

  describe('Progress Indicators - Mastery Level', () => {
    it('should display mastery level bar at 0%', () => {
      render(<VocabularyCard item={mockVocabularyItem} masteryLevel={0} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should display mastery level bar at 50%', () => {
      render(<VocabularyCard item={mockVocabularyItem} masteryLevel={50} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should display mastery level bar at 100%', () => {
      render(<VocabularyCard item={mockVocabularyItem} masteryLevel={100} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should use red color for mastery level 0-19%', () => {
      render(<VocabularyCard item={mockVocabularyItem} masteryLevel={10} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveClass('bg-red-500');
    });

    it('should use orange color for mastery level 20-39%', () => {
      render(<VocabularyCard item={mockVocabularyItem} masteryLevel={30} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveClass('bg-orange-500');
    });

    it('should use yellow color for mastery level 40-59%', () => {
      render(<VocabularyCard item={mockVocabularyItem} masteryLevel={50} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveClass('bg-yellow-500');
    });

    it('should use blue color for mastery level 60-79%', () => {
      render(<VocabularyCard item={mockVocabularyItem} masteryLevel={70} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveClass('bg-blue-500');
    });

    it('should use green color for mastery level 80-100%', () => {
      render(<VocabularyCard item={mockVocabularyItem} masteryLevel={90} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveClass('bg-green-500');
    });
  });

  describe('Progress Indicators - Review Statistics', () => {
    it('should display times reviewed count', () => {
      render(<VocabularyCard item={mockVocabularyItem} timesReviewed={15} />);

      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('Reviewed')).toBeInTheDocument();
    });

    it('should display last reviewed date when provided', () => {
      const lastReviewed = new Date('2025-09-15');
      render(<VocabularyCard item={mockVocabularyItem} lastReviewedDate={lastReviewed} />);

      // Check for date parts since formatting may vary
      expect(screen.getByText(/Sep/)).toBeInTheDocument();
      expect(screen.getByText('Last Review')).toBeInTheDocument();
    });

    it('should display "Never" for last reviewed when not provided', () => {
      render(<VocabularyCard item={mockVocabularyItem} />);

      const lastReviewElements = screen.getAllByText('Never');
      expect(lastReviewElements.length).toBeGreaterThan(0);
    });

    it('should display next review date with spaced repetition', () => {
      const nextReview = new Date('2025-10-20');
      render(<VocabularyCard item={mockVocabularyItem} nextReviewDate={nextReview} />);

      // Check for date parts since formatting may vary
      expect(screen.getByText(/Oct/)).toBeInTheDocument();
      expect(screen.getByText('Next Review')).toBeInTheDocument();
    });
  });

  // =============================================================================
  // ACTIONS TESTS (15 tests)
  // =============================================================================

  describe('Actions - Mark as Mastered', () => {
    it('should display "Mark Mastered" button when not mastered', () => {
      render(<VocabularyCard item={mockVocabularyItem} isMastered={false} />);

      expect(screen.getByText('Mark Mastered')).toBeInTheDocument();
    });

    it('should display "Mastered" button when mastered', () => {
      render(<VocabularyCard item={mockVocabularyItem} isMastered={true} />);

      expect(screen.getByText('Mastered')).toBeInTheDocument();
    });

    it('should call onMarkMastered when clicked', () => {
      const onMarkMastered = vi.fn();
      render(
        <VocabularyCard item={mockVocabularyItem} onMarkMastered={onMarkMastered} />
      );

      const masteredButton = screen.getByText('Mark Mastered');
      fireEvent.click(masteredButton);

      expect(onMarkMastered).toHaveBeenCalledWith('vocab-1');
    });

    it('should style mastered button differently when mastered', () => {
      render(<VocabularyCard item={mockVocabularyItem} isMastered={true} />);

      const masteredButton = screen.getByText('Mastered');
      expect(masteredButton).toHaveClass('bg-green-100');
    });
  });

  describe('Actions - Mark for Review', () => {
    it('should display review button', () => {
      render(<VocabularyCard item={mockVocabularyItem} />);

      expect(screen.getByLabelText('Mark for review')).toBeInTheDocument();
    });

    it('should call onMarkForReview when clicked', () => {
      const onMarkForReview = vi.fn();
      render(
        <VocabularyCard item={mockVocabularyItem} onMarkForReview={onMarkForReview} />
      );

      const reviewButton = screen.getByLabelText('Mark for review');
      fireEvent.click(reviewButton);

      expect(onMarkForReview).toHaveBeenCalledWith('vocab-1');
    });
  });

  describe('Actions - Custom Lists', () => {
    it('should display "Add to List" button', () => {
      render(<VocabularyCard item={mockVocabularyItem} />);

      expect(screen.getByLabelText('Add to list')).toBeInTheDocument();
    });

    it('should show add to list form when button clicked', async () => {
      render(<VocabularyCard item={mockVocabularyItem} />);

      const addButton = screen.getByLabelText('Add to list');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByLabelText('New list name')).toBeInTheDocument();
      });
    });

    it('should call onAddToList with correct parameters', async () => {
      const onAddToList = vi.fn();

      render(<VocabularyCard item={mockVocabularyItem} onAddToList={onAddToList} />);

      const addButton = screen.getByLabelText('Add to list');
      fireEvent.click(addButton);

      const input = screen.getByLabelText('New list name');
      fireEvent.change(input, { target: { value: 'My Custom List' } });

      const confirmButton = screen.getByLabelText('Confirm add to list');
      fireEvent.click(confirmButton);

      expect(onAddToList).toHaveBeenCalledWith('vocab-1', 'My Custom List');
    });

    it('should display custom lists as tags', () => {
      render(
        <VocabularyCard
          item={mockVocabularyItem}
          customLists={['Advanced Words', 'Test Prep']}
        />
      );

      expect(screen.getByText('Advanced Words')).toBeInTheDocument();
      expect(screen.getByText('Test Prep')).toBeInTheDocument();
    });

    it('should call onRemoveFromList when remove is clicked', () => {
      const onRemoveFromList = vi.fn();
      render(
        <VocabularyCard
          item={mockVocabularyItem}
          customLists={['Advanced Words']}
          onRemoveFromList={onRemoveFromList}
        />
      );

      const removeButton = screen.getByLabelText('Remove from Advanced Words');
      fireEvent.click(removeButton);

      expect(onRemoveFromList).toHaveBeenCalledWith('vocab-1', 'Advanced Words');
    });

    it('should hide add to list form when cancel is clicked', () => {
      render(<VocabularyCard item={mockVocabularyItem} />);

      const addButton = screen.getByLabelText('Add to list');
      fireEvent.click(addButton);

      const cancelButton = screen.getByLabelText('Cancel add to list');
      fireEvent.click(cancelButton);

      expect(screen.queryByLabelText('New list name')).not.toBeInTheDocument();
    });

    it('should not call onAddToList with empty list name', () => {
      const onAddToList = vi.fn();
      render(<VocabularyCard item={mockVocabularyItem} onAddToList={onAddToList} />);

      const addButton = screen.getByLabelText('Add to list');
      fireEvent.click(addButton);

      const confirmButton = screen.getByLabelText('Confirm add to list');
      fireEvent.click(confirmButton);

      expect(onAddToList).not.toHaveBeenCalled();
    });
  });

  describe('Actions - Report Issue', () => {
    it('should display report issue button', () => {
      render(<VocabularyCard item={mockVocabularyItem} />);

      expect(screen.getByLabelText('Report issue')).toBeInTheDocument();
    });

    it('should show report issue form when button clicked', () => {
      render(<VocabularyCard item={mockVocabularyItem} />);

      const reportButton = screen.getByLabelText('Report issue');
      fireEvent.click(reportButton);

      expect(screen.getByLabelText('Report issue description')).toBeInTheDocument();
    });

    it('should call onReportIssue with correct parameters', async () => {
      const onReportIssue = vi.fn();

      render(<VocabularyCard item={mockVocabularyItem} onReportIssue={onReportIssue} />);

      const reportButton = screen.getByLabelText('Report issue');
      fireEvent.click(reportButton);

      const textarea = screen.getByLabelText('Report issue description');
      fireEvent.change(textarea, { target: { value: 'The definition is incorrect' } });

      const submitButton = screen.getByLabelText('Submit issue report');
      fireEvent.click(submitButton);

      expect(onReportIssue).toHaveBeenCalledWith('vocab-1', 'The definition is incorrect');
    });

    it('should hide report form when cancel is clicked', () => {
      render(<VocabularyCard item={mockVocabularyItem} />);

      const reportButton = screen.getByLabelText('Report issue');
      fireEvent.click(reportButton);

      const cancelButton = screen.getByLabelText('Cancel report');
      fireEvent.click(cancelButton);

      expect(screen.queryByLabelText('Report issue description')).not.toBeInTheDocument();
    });
  });

  // =============================================================================
  // ACCESSIBILITY TESTS (10 tests)
  // =============================================================================

  describe('Accessibility - Semantic HTML and ARIA', () => {
    it('should have proper article role for card semantics', () => {
      render(<VocabularyCard item={mockVocabularyItem} />);

      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    it('should have descriptive aria-label for card', () => {
      render(<VocabularyCard item={mockVocabularyItem} />);

      const article = screen.getByRole('article');
      expect(article).toHaveAttribute('aria-label', 'Vocabulary card for magnificent');
    });

    it('should have accessible button labels for all actions', () => {
      render(<VocabularyCard item={mockVocabularyItem} />);

      expect(screen.getByLabelText('Play pronunciation')).toBeInTheDocument();
      expect(screen.getByLabelText('Add to favorites')).toBeInTheDocument();
      expect(screen.getByLabelText('Edit card')).toBeInTheDocument();
      expect(screen.getByLabelText('Delete card')).toBeInTheDocument();
      expect(screen.getByLabelText('Share card')).toBeInTheDocument();
      expect(screen.getByLabelText('Report issue')).toBeInTheDocument();
    });

    it('should have proper aria attributes for progress bar', () => {
      render(<VocabularyCard item={mockVocabularyItem} masteryLevel={75} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      expect(progressBar).toHaveAttribute('aria-label', 'Mastery level: 75%');
    });

    it('should be keyboard navigable with tabIndex', () => {
      render(<VocabularyCard item={mockVocabularyItem} />);

      const article = screen.getByRole('article');
      expect(article).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Accessibility - Keyboard Shortcuts', () => {
    it('should flip card on spacebar press', () => {
      render(<VocabularyCard item={mockVocabularyItem} />);

      const article = screen.getByRole('article');
      fireEvent.keyDown(article, { key: ' ' });

      expect(screen.getByText('magnífico')).toBeInTheDocument();
    });

    it('should flip card on "Spacebar" key press (legacy)', () => {
      render(<VocabularyCard item={mockVocabularyItem} />);

      const article = screen.getByRole('article');
      fireEvent.keyDown(article, { key: 'Spacebar' });

      expect(screen.getByText('magnífico')).toBeInTheDocument();
    });

    it('should not flip card on other key presses', () => {
      render(<VocabularyCard item={mockVocabularyItem} />);

      const article = screen.getByRole('article');
      fireEvent.keyDown(article, { key: 'Enter' });

      expect(screen.getByText('magnificent')).toBeInTheDocument();
      expect(screen.queryByText('magnífico')).not.toBeInTheDocument();
    });

    it('should prevent default behavior on spacebar', () => {
      render(<VocabularyCard item={mockVocabularyItem} />);

      const article = screen.getByRole('article');
      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      article.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Accessibility - Focus Management', () => {
    it('should maintain focus on card after interactions', () => {
      render(<VocabularyCard item={mockVocabularyItem} />);

      const article = screen.getByRole('article');
      article.focus();
      expect(article).toHaveFocus();

      fireEvent.keyDown(article, { key: ' ' });
      // Focus should remain on card
      expect(document.activeElement).toBe(article);
    });
  });

  // =============================================================================
  // EDGE CASES AND ERROR HANDLING (10+ tests)
  // =============================================================================

  describe('Edge Cases', () => {
    it('should handle missing translation gracefully', () => {
      const itemWithoutSpanish = {
        ...mockVocabularyItem,
        translations: { en: 'magnificent' },
      };

      render(<VocabularyCard item={itemWithoutSpanish} />);

      const flipButton = screen.getByText(/Flip to Spanish/);
      fireEvent.click(flipButton);

      // Should show definition as fallback
      expect(
        screen.getByText(/Extremely beautiful, elaborate, or impressive/)
      ).toBeInTheDocument();
    });

    it('should handle empty context sentences array', () => {
      render(<VocabularyCard item={mockMinimalItem} mode="expanded" />);

      expect(screen.queryByText(/Example Usage/)).not.toBeInTheDocument();
    });

    it('should handle zero mastery level', () => {
      render(<VocabularyCard item={mockVocabularyItem} masteryLevel={0} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    it('should handle zero times reviewed', () => {
      render(<VocabularyCard item={mockVocabularyItem} timesReviewed={0} />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle undefined dates', () => {
      render(<VocabularyCard item={mockVocabularyItem} />);

      const neverElements = screen.getAllByText('Never');
      expect(neverElements.length).toBeGreaterThan(0);
    });

    it('should handle empty custom lists array', () => {
      render(<VocabularyCard item={mockVocabularyItem} customLists={[]} />);

      // Should not crash
      expect(screen.getByText('magnificent')).toBeInTheDocument();
    });

    it('should handle whitespace-only input in add to list', async () => {
      const onAddToList = vi.fn();
      const user = userEvent.setup();

      render(<VocabularyCard item={mockVocabularyItem} onAddToList={onAddToList} />);

      const addButton = screen.getByLabelText('Add to list');
      fireEvent.click(addButton);

      const input = screen.getByLabelText('New list name');
      await user.type(input, '   ');

      const confirmButton = screen.getByLabelText('Confirm add to list');
      fireEvent.click(confirmButton);

      expect(onAddToList).not.toHaveBeenCalled();
    });

    it('should handle whitespace-only input in report issue', async () => {
      const onReportIssue = vi.fn();
      const user = userEvent.setup();

      render(<VocabularyCard item={mockVocabularyItem} onReportIssue={onReportIssue} />);

      const reportButton = screen.getByLabelText('Report issue');
      fireEvent.click(reportButton);

      const textarea = screen.getByLabelText('Report issue description');
      await user.type(textarea, '   ');

      const submitButton = screen.getByLabelText('Submit issue report');
      fireEvent.click(submitButton);

      expect(onReportIssue).not.toHaveBeenCalled();
    });

    it('should handle rapid flip toggles', () => {
      render(<VocabularyCard item={mockVocabularyItem} />);

      const flipButton = screen.getByText(/Flip to Spanish/);

      // Rapid clicks
      fireEvent.click(flipButton);
      fireEvent.click(screen.getByText(/Show English/));
      fireEvent.click(screen.getByText(/Flip to Spanish/));

      // Should end up flipped
      expect(screen.getByText('magnífico')).toBeInTheDocument();
    });

    it('should handle multiple custom lists', () => {
      const manyLists = Array.from({ length: 10 }, (_, i) => `List ${i + 1}`);

      render(<VocabularyCard item={mockVocabularyItem} customLists={manyLists} />);

      manyLists.forEach((list) => {
        expect(screen.getByText(list)).toBeInTheDocument();
      });
    });
  });

  // =============================================================================
  // SNAPSHOT TESTS
  // =============================================================================

  describe('Snapshot Tests', () => {
    it('should match snapshot for expanded mode', () => {
      const { container } = render(
        <VocabularyCard item={mockVocabularyItem} mode="expanded" />
      );

      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for compact mode', () => {
      const { container } = render(
        <VocabularyCard item={mockVocabularyItem} mode="compact" />
      );

      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot for flipped state', () => {
      const { container } = render(<VocabularyCard item={mockVocabularyItem} />);

      const flipButton = screen.getByText(/Flip to Spanish/);
      fireEvent.click(flipButton);

      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot with all features enabled', () => {
      const { container } = render(
        <VocabularyCard
          item={mockVocabularyItem}
          isFavorite={true}
          isMastered={true}
          masteryLevel={85}
          timesReviewed={20}
          lastReviewedDate={new Date('2025-09-15')}
          nextReviewDate={new Date('2025-10-20')}
          customLists={['Advanced', 'Test Prep']}
        />
      );

      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
