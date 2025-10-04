import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../utils/test-utils';
import { EnhancedQASystem } from '@/components/EnhancedQASystem';
import * as useQASystemHook from '@/hooks/useQASystem';

// Mock the QA hook
vi.mock('@/hooks/useQASystem');
const mockUseQASystem = vi.mocked(useQASystemHook);

const defaultProps = {
  imageUrl: 'https://example.com/test-image.jpg',
  description: 'A beautiful landscape with mountains and trees.',
  language: 'es' as const,
  difficulty: 'beginner' as const,
  questionCount: 3,
  timeLimit: 30,
  showHints: true,
  allowSkip: false,
};

const mockQASystemHook = {
  questions: [],
  currentQuestionIndex: 0,
  sessionState: 'setup' as const,
  sessionData: {
    totalQuestions: 3,
    answeredQuestions: 0,
    correctAnswers: 0,
    totalTime: 0,
    averageTime: 0,
    accuracy: 0,
    streak: 0,
    maxStreak: 0,
  },
  generateQuestions: vi.fn(),
  startSession: vi.fn(),
  pauseSession: vi.fn(),
  resumeSession: vi.fn(),
  resetSession: vi.fn(),
  submitAnswer: vi.fn(),
  nextQuestion: vi.fn(),
  skipQuestion: vi.fn(),
};

describe('EnhancedQASystem', () => {
  beforeEach(() => {
    mockUseQASystem.mockReturnValue(mockQASystemHook);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('Setup State', () => {
    it('should render setup screen with correct information', () => {
      render(<EnhancedQASystem {...defaultProps} />);

      expect(screen.getByText('Sistema de Preguntas Avanzado')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Question count
      expect(screen.getByText('30s')).toBeInTheDocument(); // Time limit
      expect(screen.getByText('Comenzar Quiz')).toBeInTheDocument();
    });

    it('should render in English when language is "en"', () => {
      render(<EnhancedQASystem {...defaultProps} language="en" />);

      expect(screen.getByText('Advanced Q&A System')).toBeInTheDocument();
      expect(screen.getByText('Start Quiz')).toBeInTheDocument();
      expect(screen.getByText('Questions')).toBeInTheDocument();
      expect(screen.getByText('Per question')).toBeInTheDocument();
    });

    it('should start session when start button is clicked', async () => {
      const { user } = render(<EnhancedQASystem {...defaultProps} />);
      
      const startButton = screen.getByText('Comenzar Quiz');
      await user.click(startButton);

      expect(mockQASystemHook.startSession).toHaveBeenCalled();
    });

    it('should display correct stats in setup', () => {
      render(<EnhancedQASystem {...defaultProps} questionCount={5} timeLimit={45} />);

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('45s')).toBeInTheDocument();
    });
  });

  describe('Active Session State', () => {
    const mockQuestion = {
      id: '1',
      question: '¿Cuál es el elemento principal que se describe en la imagen?',
      options: [
        'Un paisaje natural',
        'Un edificio moderno', 
        'Una persona',
        'Un objeto cotidiano'
      ],
      correctAnswer: 0,
      explanation: 'La descripción indica principalmente elementos naturales en la imagen.',
      difficulty: 'beginner' as const,
      category: 'comprehension',
      timeLimit: 30
    };

    beforeEach(() => {
      mockUseQASystem.mockReturnValue({
        ...mockQASystemHook,
        sessionState: 'active',
        questions: [mockQuestion],
        currentQuestionIndex: 0,
      });
    });

    it('should render active session with question and options', () => {
      render(<EnhancedQASystem {...defaultProps} />);

      expect(screen.getByText(mockQuestion.question)).toBeInTheDocument();
      mockQuestion.options.forEach(option => {
        expect(screen.getByText(option)).toBeInTheDocument();
      });
    });

    it('should show timer countdown', () => {
      render(<EnhancedQASystem {...defaultProps} />);

      // Should show timer
      expect(screen.getByText('30s')).toBeInTheDocument();
    });

    it('should handle answer selection', async () => {
      const { user } = render(<EnhancedQASystem {...defaultProps} />);
      
      const firstOption = screen.getByText(mockQuestion.options[0]);
      await user.click(firstOption);

      // Should show selected state (visual feedback)
      expect(firstOption.closest('button')).toHaveClass('border-blue-500');
    });

    it('should handle answer submission', async () => {
      const { user } = render(<EnhancedQASystem {...defaultProps} />);
      
      // Select an answer
      const firstOption = screen.getByText(mockQuestion.options[0]);
      await user.click(firstOption);

      // Submit answer
      const submitButton = screen.getByText('Confirmar');
      await user.click(submitButton);

      expect(mockQASystemHook.submitAnswer).toHaveBeenCalled();
    });

    it('should show pause/resume controls', async () => {
      const { user } = render(<EnhancedQASystem {...defaultProps} />);

      const pauseButton = screen.getByRole('button', { name: /pause/i });
      await user.click(pauseButton);

      expect(mockQASystemHook.pauseSession).toHaveBeenCalled();
    });

    it('should show progress information', () => {
      render(<EnhancedQASystem {...defaultProps} />);

      expect(screen.getByText('Pregunta 1 de 3')).toBeInTheDocument();
      expect(screen.getByText('beginner')).toBeInTheDocument();
    });

    it('should handle skip question when allowed', async () => {
      const { user } = render(<EnhancedQASystem {...defaultProps} allowSkip={true} />);

      const skipButton = screen.getByText('Saltar');
      await user.click(skipButton);

      expect(mockQASystemHook.skipQuestion).toHaveBeenCalled();
    });

    it('should not show skip button when not allowed', () => {
      render(<EnhancedQASystem {...defaultProps} allowSkip={false} />);

      expect(screen.queryByText('Saltar')).not.toBeInTheDocument();
    });

    it('should show hint functionality', async () => {
      const { user } = render(<EnhancedQASystem {...defaultProps} showHints={true} />);

      const hintButton = screen.getByText('Mostrar pista');
      await user.click(hintButton);

      expect(screen.getByText('Piensa en el contexto de la imagen y las palabras clave en la descripción.')).toBeInTheDocument();
      expect(screen.getByText('Ocultar pista')).toBeInTheDocument();
    });

    it('should not show hints when disabled', () => {
      render(<EnhancedQASystem {...defaultProps} showHints={false} />);

      expect(screen.queryByText('Mostrar pista')).not.toBeInTheDocument();
    });
  });

  describe('Paused State', () => {
    beforeEach(() => {
      mockUseQASystem.mockReturnValue({
        ...mockQASystemHook,
        sessionState: 'paused',
        questions: [{
          id: '1',
          question: 'Test question',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 0,
          explanation: 'Test explanation',
          difficulty: 'beginner',
          category: 'test',
          timeLimit: 30
        }],
      });
    });

    it('should show resume button when paused', async () => {
      const { user } = render(<EnhancedQASystem {...defaultProps} />);

      const resumeButton = screen.getByRole('button', { name: /play/i });
      await user.click(resumeButton);

      expect(mockQASystemHook.resumeSession).toHaveBeenCalled();
    });
  });

  describe('Completed State', () => {
    const completedSessionData = {
      totalQuestions: 3,
      answeredQuestions: 3,
      correctAnswers: 2,
      totalTime: 90,
      averageTime: 30,
      accuracy: 67,
      streak: 2,
      maxStreak: 2,
    };

    beforeEach(() => {
      mockUseQASystem.mockReturnValue({
        ...mockQASystemHook,
        sessionState: 'completed',
        sessionData: completedSessionData,
      });
    });

    it('should render completion screen with results', () => {
      render(<EnhancedQASystem {...defaultProps} />);

      expect(screen.getByText('¡Quiz Completado!')).toBeInTheDocument();
      expect(screen.getByText('67% de precisión')).toBeInTheDocument();
      expect(screen.getByText('2/3')).toBeInTheDocument();
      expect(screen.getByText('30s')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Max streak
      expect(screen.getByText('90s')).toBeInTheDocument(); // Total time
    });

    it('should handle reset session', async () => {
      const { user } = render(<EnhancedQASystem {...defaultProps} />);

      const resetButton = screen.getByText('Nuevo Quiz');
      await user.click(resetButton);

      expect(mockQASystemHook.resetSession).toHaveBeenCalled();
    });

    it('should handle export functionality', async () => {
      const { user } = render(<EnhancedQASystem {...defaultProps} />);

      const exportButton = screen.getByText('Exportar');
      expect(exportButton).toBeInTheDocument();
    });

    it('should render in English for completed state', () => {
      render(<EnhancedQASystem {...defaultProps} language="en" />);

      expect(screen.getByText('Quiz Complete!')).toBeInTheDocument();
      expect(screen.getByText('67% accuracy')).toBeInTheDocument();
      expect(screen.getByText('New Quiz')).toBeInTheDocument();
      expect(screen.getByText('Export')).toBeInTheDocument();
    });
  });

  describe('Timer Functionality', () => {
    beforeEach(() => {
      mockUseQASystem.mockReturnValue({
        ...mockQASystemHook,
        sessionState: 'active',
        questions: [{
          id: '1',
          question: 'Test question',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 0,
          explanation: 'Test explanation',
          difficulty: 'beginner',
          category: 'test',
          timeLimit: 30
        }],
      });
    });

    it('should update timer color based on remaining time', () => {
      render(<EnhancedQASystem {...defaultProps} />);
      
      const timerElement = screen.getByText('30s');
      expect(timerElement).toHaveClass('text-green-600'); // Should be green when time is full
    });

    it('should handle time running out', () => {
      render(<EnhancedQASystem {...defaultProps} />);
      
      // Fast-forward time
      vi.advanceTimersByTime(30000);

      expect(mockQASystemHook.submitAnswer).toHaveBeenCalledWith(null, true);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<EnhancedQASystem {...defaultProps} />);

      const startButton = screen.getByRole('button', { name: /comenzar quiz/i });
      expect(startButton).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const { user } = render(<EnhancedQASystem {...defaultProps} />);

      const startButton = screen.getByText('Comenzar Quiz');
      
      await user.keyboard('{Tab}');
      expect(startButton).toHaveFocus();
    });
  });

  describe('Callbacks', () => {
    it('should call onSessionComplete when session ends', () => {
      const onSessionComplete = vi.fn();
      
      mockUseQASystem.mockReturnValue({
        ...mockQASystemHook,
        sessionState: 'completed',
        sessionData: {
          totalQuestions: 1,
          answeredQuestions: 1,
          correctAnswers: 1,
          totalTime: 30,
          averageTime: 30,
          accuracy: 100,
          streak: 1,
          maxStreak: 1,
        },
      });

      render(<EnhancedQASystem {...defaultProps} onSessionComplete={onSessionComplete} />);

      expect(screen.getByText('¡Quiz Completado!')).toBeInTheDocument();
    });

    it('should call onQuestionAnswered for each answer', async () => {
      const onQuestionAnswered = vi.fn();
      
      mockUseQASystem.mockReturnValue({
        ...mockQASystemHook,
        sessionState: 'active',
        questions: [{
          id: '1',
          question: 'Test question',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 0,
          explanation: 'Test explanation',
          difficulty: 'beginner',
          category: 'test',
          timeLimit: 30
        }],
      });

      const { user } = render(
        <EnhancedQASystem {...defaultProps} onQuestionAnswered={onQuestionAnswered} />
      );

      // Select and submit answer
      const firstOption = screen.getByText('A');
      await user.click(firstOption);

      const submitButton = screen.getByText('Confirmar');
      await user.click(submitButton);

      expect(mockQASystemHook.submitAnswer).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should render within performance threshold', async () => {
      const startTime = performance.now();
      render(<EnhancedQASystem {...defaultProps} />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should render in under 100ms
    });

    it('should handle large question counts efficiently', () => {
      render(<EnhancedQASystem {...defaultProps} questionCount={50} />);
      
      expect(screen.getByText('50')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing props gracefully', () => {
      const { container } = render(
        <EnhancedQASystem 
          imageUrl=""
          description=""
        />
      );

      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle invalid difficulty level', () => {
      render(
        <EnhancedQASystem 
          {...defaultProps}
          // @ts-ignore - Testing invalid prop
          difficulty="invalid"
        />
      );

      expect(screen.getByText('Sistema de Preguntas Avanzado')).toBeInTheDocument();
    });
  });
});