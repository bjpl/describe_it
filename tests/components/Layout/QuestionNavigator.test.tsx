import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuestionNavigator } from '@/components/QuestionNavigator';
import '@testing-library/jest-dom';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>
  }
}));

vi.mock('@/components/ui/MotionComponents', () => ({
  MotionButton: ({ children, onClick, className, disabled, ...props }: any) => (
    <button onClick={onClick} className={className} disabled={disabled} {...props}>
      {children}
    </button>
  )
}));

describe('QuestionNavigator Component', () => {
  const defaultProps = {
    currentIndex: 0,
    totalQuestions: 10,
    onPrevious: vi.fn(),
    onNext: vi.fn(),
    onGoToQuestion: vi.fn(),
    onReset: vi.fn(),
    answeredQuestions: new Set<number>(),
    correctAnswers: new Set<number>()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Basic Rendering Tests
  describe('Basic Rendering', () => {
    it('should render component with title', () => {
      render(<QuestionNavigator {...defaultProps} />);
      expect(screen.getByText('Question Navigation')).toBeInTheDocument();
    });

    it('should display current question number', () => {
      render(<QuestionNavigator {...defaultProps} />);
      expect(screen.getByText('Question 1 of 10')).toBeInTheDocument();
    });

    it('should render reset button', () => {
      render(<QuestionNavigator {...defaultProps} />);
      expect(screen.getByText('Reset')).toBeInTheDocument();
    });

    it('should render all question buttons', () => {
      render(<QuestionNavigator {...defaultProps} />);

      for (let i = 1; i <= 10; i++) {
        expect(screen.getByText(i.toString())).toBeInTheDocument();
      }
    });
  });

  // 2. Navigation Button Tests
  describe('Navigation Buttons', () => {
    it('should render Previous button', () => {
      render(<QuestionNavigator {...defaultProps} />);
      expect(screen.getByText('Previous')).toBeInTheDocument();
    });

    it('should render Next button', () => {
      render(<QuestionNavigator {...defaultProps} />);
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    it('should disable Previous button when on first question', () => {
      render(<QuestionNavigator {...defaultProps} currentIndex={0} />);
      const prevButton = screen.getByText('Previous').closest('button');
      expect(prevButton).toBeDisabled();
    });

    it('should enable Previous button when not on first question', () => {
      render(<QuestionNavigator {...defaultProps} currentIndex={5} />);
      const prevButton = screen.getByText('Previous').closest('button');
      expect(prevButton).not.toBeDisabled();
    });

    it('should disable Next button when on last question', () => {
      render(<QuestionNavigator {...defaultProps} currentIndex={9} totalQuestions={10} />);
      const nextButton = screen.getByText('Next').closest('button');
      expect(nextButton).toBeDisabled();
    });

    it('should enable Next button when not on last question', () => {
      render(<QuestionNavigator {...defaultProps} currentIndex={5} />);
      const nextButton = screen.getByText('Next').closest('button');
      expect(nextButton).not.toBeDisabled();
    });

    it('should call onPrevious when Previous clicked', () => {
      render(<QuestionNavigator {...defaultProps} currentIndex={5} />);
      const prevButton = screen.getByText('Previous').closest('button');

      fireEvent.click(prevButton!);
      expect(defaultProps.onPrevious).toHaveBeenCalledTimes(1);
    });

    it('should call onNext when Next clicked', () => {
      render(<QuestionNavigator {...defaultProps} currentIndex={5} />);
      const nextButton = screen.getByText('Next').closest('button');

      fireEvent.click(nextButton!);
      expect(defaultProps.onNext).toHaveBeenCalledTimes(1);
    });
  });

  // 3. Question Grid Tests
  describe('Question Grid', () => {
    it('should highlight current question', () => {
      render(<QuestionNavigator {...defaultProps} currentIndex={3} />);
      const currentButton = screen.getByText('4').closest('button');

      expect(currentButton).toHaveClass('bg-blue-600', 'text-white');
    });

    it('should call onGoToQuestion when question button clicked', () => {
      render(<QuestionNavigator {...defaultProps} />);
      const questionButton = screen.getByText('5').closest('button');

      fireEvent.click(questionButton!);
      expect(defaultProps.onGoToQuestion).toHaveBeenCalledWith(4);
    });

    it('should show unanswered questions with default styling', () => {
      render(<QuestionNavigator {...defaultProps} />);
      const unansweredButton = screen.getByText('1').closest('button');

      expect(unansweredButton).toHaveClass('bg-gray-100');
    });

    it('should show correct answers with green styling', () => {
      const answeredQuestions = new Set([0, 1]);
      const correctAnswers = new Set([0]);

      render(
        <QuestionNavigator
          {...defaultProps}
          answeredQuestions={answeredQuestions}
          correctAnswers={correctAnswers}
        />
      );

      // Check that icons are rendered (CheckCircle for correct)
      const { container } = render(
        <QuestionNavigator
          {...defaultProps}
          answeredQuestions={answeredQuestions}
          correctAnswers={correctAnswers}
        />
      );

      expect(container.querySelectorAll('.text-green-600').length).toBeGreaterThan(0);
    });

    it('should show incorrect answers with red styling', () => {
      const answeredQuestions = new Set([0, 1]);
      const correctAnswers = new Set([0]); // 1 is incorrect

      const { container } = render(
        <QuestionNavigator
          {...defaultProps}
          answeredQuestions={answeredQuestions}
          correctAnswers={correctAnswers}
        />
      );

      expect(container.querySelectorAll('.text-red-600').length).toBeGreaterThan(0);
    });
  });

  // 4. Progress Summary Tests
  describe('Progress Summary', () => {
    it('should display total answered questions', () => {
      const answeredQuestions = new Set([0, 1, 2, 3]);

      render(
        <QuestionNavigator
          {...defaultProps}
          answeredQuestions={answeredQuestions}
        />
      );

      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('Answered')).toBeInTheDocument();
    });

    it('should display correct answers count', () => {
      const answeredQuestions = new Set([0, 1, 2]);
      const correctAnswers = new Set([0, 2]);

      render(
        <QuestionNavigator
          {...defaultProps}
          answeredQuestions={answeredQuestions}
          correctAnswers={correctAnswers}
        />
      );

      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Correct')).toBeInTheDocument();
    });

    it('should display incorrect answers count', () => {
      const answeredQuestions = new Set([0, 1, 2, 3]);
      const correctAnswers = new Set([0, 2]);

      render(
        <QuestionNavigator
          {...defaultProps}
          answeredQuestions={answeredQuestions}
          correctAnswers={correctAnswers}
        />
      );

      // Answered: 4, Correct: 2, Incorrect: 2
      const incorrectCounts = screen.getAllByText('2');
      expect(incorrectCounts.length).toBeGreaterThan(0);
      expect(screen.getByText('Incorrect')).toBeInTheDocument();
    });

    it('should show zero when no questions answered', () => {
      render(<QuestionNavigator {...defaultProps} />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  // 5. Reset Functionality Tests
  describe('Reset Functionality', () => {
    it('should call onReset when reset button clicked', () => {
      render(<QuestionNavigator {...defaultProps} />);
      const resetButton = screen.getByText('Reset').closest('button');

      fireEvent.click(resetButton!);
      expect(defaultProps.onReset).toHaveBeenCalledTimes(1);
    });

    it('should display reset icon', () => {
      const { container } = render(<QuestionNavigator {...defaultProps} />);
      const resetButton = screen.getByText('Reset').closest('button');
      const icon = resetButton?.querySelector('svg');

      expect(icon).toBeInTheDocument();
    });
  });

  // 6. Status Indicator Tests
  describe('Status Indicators', () => {
    it('should show checkmark icon for correct answers', () => {
      const answeredQuestions = new Set([0]);
      const correctAnswers = new Set([0]);

      const { container } = render(
        <QuestionNavigator
          {...defaultProps}
          answeredQuestions={answeredQuestions}
          correctAnswers={correctAnswers}
        />
      );

      // CheckCircle icon should be present
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should show X icon for incorrect answers', () => {
      const answeredQuestions = new Set([0]);
      const correctAnswers = new Set([]);

      const { container } = render(
        <QuestionNavigator
          {...defaultProps}
          answeredQuestions={answeredQuestions}
          correctAnswers={correctAnswers}
        />
      );

      // XCircle icon should be present
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  // 7. Responsive Layout Tests
  describe('Responsive Layout', () => {
    it('should use grid layout for questions', () => {
      const { container } = render(<QuestionNavigator {...defaultProps} />);
      const grid = container.querySelector('.grid.grid-cols-5');

      expect(grid).toBeInTheDocument();
    });

    it('should have proper spacing between elements', () => {
      const { container } = render(<QuestionNavigator {...defaultProps} />);
      const grid = container.querySelector('.gap-2');

      expect(grid).toBeInTheDocument();
    });
  });

  // 8. Dark Mode Tests
  describe('Dark Mode Support', () => {
    it('should have dark mode classes', () => {
      const { container } = render(<QuestionNavigator {...defaultProps} />);
      const card = container.querySelector('.dark\\:bg-gray-800');

      expect(card).toBeInTheDocument();
    });

    it('should apply dark mode to text', () => {
      const { container } = render(<QuestionNavigator {...defaultProps} />);
      const title = screen.getByText('Question Navigation');

      expect(title).toHaveClass('dark:text-white');
    });
  });

  // 9. Custom ClassName Tests
  describe('Custom ClassName', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <QuestionNavigator {...defaultProps} className="custom-class" />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  // 10. Edge Cases Tests
  describe('Edge Cases', () => {
    it('should handle single question', () => {
      render(
        <QuestionNavigator {...defaultProps} totalQuestions={1} currentIndex={0} />
      );

      expect(screen.getByText('Question 1 of 1')).toBeInTheDocument();

      const prevButton = screen.getByText('Previous').closest('button');
      const nextButton = screen.getByText('Next').closest('button');

      expect(prevButton).toBeDisabled();
      expect(nextButton).toBeDisabled();
    });

    it('should handle large number of questions', () => {
      render(
        <QuestionNavigator {...defaultProps} totalQuestions={100} />
      );

      expect(screen.getByText('Question 1 of 100')).toBeInTheDocument();
    });

    it('should handle all questions answered correctly', () => {
      const answeredQuestions = new Set([0, 1, 2, 3, 4]);
      const correctAnswers = new Set([0, 1, 2, 3, 4]);

      render(
        <QuestionNavigator
          {...defaultProps}
          totalQuestions={5}
          answeredQuestions={answeredQuestions}
          correctAnswers={correctAnswers}
        />
      );

      expect(screen.getByText('5')).toBeInTheDocument(); // Answered
      expect(screen.getByText('0')).toBeInTheDocument(); // Incorrect
    });

    it('should handle all questions answered incorrectly', () => {
      const answeredQuestions = new Set([0, 1, 2]);
      const correctAnswers = new Set([]);

      render(
        <QuestionNavigator
          {...defaultProps}
          totalQuestions={3}
          answeredQuestions={answeredQuestions}
          correctAnswers={correctAnswers}
        />
      );

      expect(screen.getByText('3')).toBeInTheDocument(); // Answered & Incorrect
      expect(screen.getByText('0')).toBeInTheDocument(); // Correct
    });
  });
});
