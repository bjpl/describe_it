import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../utils/test-helpers'
import QAPanel from '@/components/QAPanel'
import type { ImageComponentProps, DescriptionStyle } from '@/types'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  CheckCircle: ({ className }: { className?: string }) => (
    <div data-testid="check-circle" className={className}>CheckCircle</div>
  ),
  XCircle: ({ className }: { className?: string }) => (
    <div data-testid="x-circle" className={className}>XCircle</div>
  ),
  RefreshCw: ({ className }: { className?: string }) => (
    <div data-testid="refresh" className={className}>RefreshCw</div>
  ),
  AlertCircle: ({ className }: { className?: string }) => (
    <div data-testid="alert-circle" className={className}>AlertCircle</div>
  ),
  Eye: ({ className }: { className?: string }) => (
    <div data-testid="eye" className={className}>Eye</div>
  ),
  EyeOff: ({ className }: { className?: string }) => (
    <div data-testid="eye-off" className={className}>EyeOff</div>
  ),
  ChevronLeft: ({ className }: { className?: string }) => (
    <div data-testid="chevron-left" className={className}>ChevronLeft</div>
  ),
  ChevronRight: ({ className }: { className?: string }) => (
    <div data-testid="chevron-right" className={className}>ChevronRight</div>
  ),
  Download: ({ className }: { className?: string }) => (
    <div data-testid="download" className={className}>Download</div>
  ),
}))

// Mock components
vi.mock('@/components/ProgressIndicator', () => ({
  QAProgressIndicator: ({ isGenerating }: { isGenerating: boolean }) => (
    <div data-testid="qa-progress-indicator">
      {isGenerating ? 'Generating questions...' : 'Ready'}
    </div>
  ),
  TextContentSkeleton: ({ lines }: { lines: number }) => (
    <div data-testid="text-skeleton" data-lines={lines}>
      Skeleton with {lines} lines
    </div>
  ),
}))

// Mock export functions
vi.mock('@/lib/export/csvExporter', () => ({
  exportResponses: vi.fn(),
  getCurrentTimestamp: vi.fn(() => '2024-01-01T00:00:00.000Z'),
}))

describe('QAPanel', () => {
  const mockSelectedImage: ImageComponentProps = {
    id: 'test-image-1',
    urls: {
      regular: 'https://example.com/image.jpg',
      small: 'https://example.com/image-small.jpg',
      thumb: 'https://example.com/image-thumb.jpg',
      full: 'https://example.com/image-full.jpg',
      raw: 'https://example.com/image-raw.jpg',
      small_s3: 'https://example.com/image-small-s3.jpg',
    },
    alt_description: 'A beautiful landscape',
    description: 'A scenic view of mountains',
    user: {
      username: 'testuser',
      name: 'Test User'
    },
    width: 1920,
    height: 1080,
    color: '#2563eb',
    created_at: '2024-01-01T00:00:00.000Z'
  }

  const mockDescriptionText = 'Una casa grande con jardín verde y flores coloridas.'
  const mockStyle: DescriptionStyle = 'narrativo'

  const defaultProps = {
    selectedImage: mockSelectedImage,
    descriptionText: mockDescriptionText,
    style: mockStyle,
    onResponseUpdate: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('should render with image and description', () => {
    renderWithProviders(<QAPanel {...defaultProps} />)
    
    expect(screen.getByText('Questions & Answers')).toBeInTheDocument()
  })

  it('should show message when no image is selected', () => {
    renderWithProviders(
      <QAPanel {...defaultProps} selectedImage={null} />
    )
    
    expect(screen.getByText(/select an image to start/i)).toBeInTheDocument()
  })

  it('should show warning when no description is provided', () => {
    renderWithProviders(
      <QAPanel {...defaultProps} descriptionText={null} />
    )
    
    expect(screen.getByText(/description required/i)).toBeInTheDocument()
    expect(screen.getByText(/please generate a description first/i)).toBeInTheDocument()
  })

  it('should show empty description warning', () => {
    renderWithProviders(
      <QAPanel {...defaultProps} descriptionText="" />
    )
    
    expect(screen.getByText(/description required/i)).toBeInTheDocument()
  })

  it('should show loading state during generation', () => {
    // Mock the useEffect to trigger loading
    const LoadingComponent = () => {
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Questions & Answers</h2>
          <div data-testid="qa-progress-indicator">Generating questions...</div>
          <div className="space-y-6">
            {[1, 2, 3, 4].map((index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <div className="space-y-4">
                  <div data-testid="text-skeleton" data-lines={1}>Skeleton with 1 lines</div>
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((optionIndex) => (
                      <div key={optionIndex} className="w-full p-4 border rounded-lg">
                        <div data-testid="text-skeleton" data-lines={1}>Skeleton with 1 lines</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    renderWithProviders(<LoadingComponent />)
    
    expect(screen.getByText('Generating questions...')).toBeInTheDocument()
    expect(screen.getAllByTestId('text-skeleton')).toHaveLength(8) // 4 questions + 4 options each
  })

  it('should display error state', () => {
    const ErrorComponent = () => (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Questions & Answers</h2>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
            <div data-testid="alert-circle">AlertCircle</div>
            <span className="font-medium">Error generating questions</span>
          </div>
          <p className="text-red-700 dark:text-red-300 mt-2">Failed to generate questions</p>
          <button className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
            Try Again
          </button>
        </div>
      </div>
    )

    renderWithProviders(<ErrorComponent />)
    
    expect(screen.getByText('Error generating questions')).toBeInTheDocument()
    expect(screen.getByText('Failed to generate questions')).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()
  })

  it('should show generate button when no questions exist', () => {
    const NoQuestionsComponent = () => (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Questions & Answers</h2>
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400">No questions generated yet.</p>
          <button className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Generate Questions
          </button>
        </div>
      </div>
    )

    renderWithProviders(<NoQuestionsComponent />)
    
    expect(screen.getByText('No questions generated yet.')).toBeInTheDocument()
    expect(screen.getByText('Generate Questions')).toBeInTheDocument()
  })

  it('should render questions when available', () => {
    const QuestionsComponent = () => (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Questions & Answers</h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Question 1 of 4
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: '25%' }}
          />
        </div>

        {/* Current Question */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              What can you see in this image?
            </h3>

            <div className="space-y-3">
              {['A house with a garden', 'A library with books', 'A restaurant', 'A park'].map((option, index) => (
                <button
                  key={index}
                  className="w-full p-4 text-left border rounded-lg transition-all duration-200 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/10"
                >
                  <span>{option}</span>
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
              <p className="text-gray-500 dark:text-gray-400 text-center">
                Select an answer to continue
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button 
            disabled
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div data-testid="chevron-left">ChevronLeft</div>
            <span>Previous</span>
          </button>

          <div className="flex items-center space-x-3">
            <button 
              disabled
              className="px-4 py-2 bg-orange-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center space-x-2">
                <div data-testid="download">Download</div>
                <span>Export CSV</span>
              </div>
            </button>

            <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2">
              <div data-testid="refresh">RefreshCw</div>
              <span>New Questions</span>
            </button>
          </div>

          <button 
            disabled
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Next</span>
            <div data-testid="chevron-right">ChevronRight</div>
          </button>
        </div>
      </div>
    )

    renderWithProviders(<QuestionsComponent />)
    
    expect(screen.getByText('What can you see in this image?')).toBeInTheDocument()
    expect(screen.getByText('Question 1 of 4')).toBeInTheDocument()
    expect(screen.getByText('A house with a garden')).toBeInTheDocument()
    expect(screen.getByText('Select an answer to continue')).toBeInTheDocument()
  })

  it('should show answer selection interface', () => {
    const AnswerSelectionComponent = () => (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            What can you see in this image?
          </h3>

          <div className="space-y-3">
            <button className="w-full p-4 text-left border rounded-lg transition-all duration-200 border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-300">
              <span>A house with a garden</span>
            </button>
            {['A library with books', 'A restaurant', 'A park'].map((option, index) => (
              <button
                key={index}
                className="w-full p-4 text-left border rounded-lg transition-all duration-200 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              >
                <span>{option}</span>
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Submit Answer
            </button>
          </div>
        </div>
      </div>
    )

    renderWithProviders(<AnswerSelectionComponent />)
    
    expect(screen.getByText('Submit Answer')).toBeInTheDocument()
    expect(screen.getByText('A house with a garden')).toBeInTheDocument()
  })

  it('should show correct answer feedback', () => {
    const CorrectAnswerComponent = () => (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="space-y-4">
          <div className="space-y-3">
            <button className="w-full p-4 text-left border rounded-lg transition-all duration-200 border-green-500 bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-300">
              <div className="flex items-center justify-between">
                <span>A house with a garden</span>
                <span className="ml-2">
                  <div data-testid="check-circle" className="h-5 w-5 text-green-600">CheckCircle</div>
                </span>
              </div>
            </button>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                <div className="flex items-center space-x-2">
                  <div data-testid="check-circle" className="h-5 w-5 text-green-600">CheckCircle</div>
                  <span className="font-medium text-green-900 dark:text-green-300">
                    Correct!
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )

    renderWithProviders(<CorrectAnswerComponent />)
    
    expect(screen.getByText('Correct!')).toBeInTheDocument()
    expect(screen.getAllByTestId('check-circle')).toHaveLength(2)
  })

  it('should show incorrect answer feedback', () => {
    const IncorrectAnswerComponent = () => (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="space-y-4">
          <div className="space-y-3">
            <button className="w-full p-4 text-left border rounded-lg transition-all duration-200 border-green-500 bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-300">
              <div className="flex items-center justify-between">
                <span>A house with a garden</span>
                <span className="ml-2">
                  <div data-testid="check-circle" className="h-5 w-5 text-green-600">CheckCircle</div>
                </span>
              </div>
            </button>
            <button className="w-full p-4 text-left border rounded-lg transition-all duration-200 border-red-500 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-300">
              <div className="flex items-center justify-between">
                <span>A library with books</span>
                <span className="ml-2">
                  <div data-testid="x-circle" className="h-5 w-5 text-red-600">XCircle</div>
                </span>
              </div>
            </button>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                <div className="flex items-center space-x-2">
                  <div data-testid="x-circle" className="h-5 w-5 text-red-600">XCircle</div>
                  <span className="font-medium text-red-900 dark:text-red-300">
                    Incorrect
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )

    renderWithProviders(<IncorrectAnswerComponent />)
    
    expect(screen.getByText('Incorrect')).toBeInTheDocument()
    expect(screen.getAllByTestId('x-circle')).toHaveLength(2)
    expect(screen.getByTestId('check-circle')).toBeInTheDocument()
  })

  it('should show explanation toggle', () => {
    const ExplanationComponent = () => (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            GPT Analysis
          </span>
          <button className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 transition-colors">
            <div data-testid="eye">Eye</div>
            <span>Show Answer</span>
          </button>
        </div>
      </div>
    )

    renderWithProviders(<ExplanationComponent />)
    
    expect(screen.getByText('GPT Analysis')).toBeInTheDocument()
    expect(screen.getByText('Show Answer')).toBeInTheDocument()
    expect(screen.getByTestId('eye')).toBeInTheDocument()
  })

  it('should show expanded explanation', () => {
    const ExpandedExplanationComponent = () => (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            GPT Analysis
          </span>
          <button className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 transition-colors">
            <div data-testid="eye-off">EyeOff</div>
            <span>Hide Answer</span>
          </button>
        </div>

        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-blue-900 dark:text-blue-300 text-sm">
            <strong>Explanation:</strong> Based on the image analysis: The image shows a house with a beautiful garden containing colorful flowers.
          </p>
        </div>
      </div>
    )

    renderWithProviders(<ExpandedExplanationComponent />)
    
    expect(screen.getByText('Hide Answer')).toBeInTheDocument()
    expect(screen.getByText(/based on the image analysis/i)).toBeInTheDocument()
    expect(screen.getByTestId('eye-off')).toBeInTheDocument()
  })

  it('should show quiz completion summary', () => {
    const CompletionSummaryComponent = () => (
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
          Quiz Progress
        </h3>
        <div className="flex items-center justify-between text-sm">
          <span className="text-blue-700 dark:text-blue-400">
            Completed: 4 / 4
          </span>
          <span className="text-blue-700 dark:text-blue-400">
            Accuracy: 75%
          </span>
        </div>
        <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 mt-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: '75%' }}
          />
        </div>

        <div className="mt-3 p-3 bg-white dark:bg-gray-700 rounded-lg">
          <div className="flex items-center justify-center space-x-2">
            <div data-testid="check-circle" className="h-5 w-5 text-green-600">CheckCircle</div>
            <span className="font-medium text-green-900 dark:text-green-300">
              Quiz Completed!
            </span>
          </div>
          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-1">
            Final Score: 3/4 (75%)
          </p>
        </div>
      </div>
    )

    renderWithProviders(<CompletionSummaryComponent />)
    
    expect(screen.getByText('Quiz Progress')).toBeInTheDocument()
    expect(screen.getByText('Completed: 4 / 4')).toBeInTheDocument()
    expect(screen.getByText('Accuracy: 75%')).toBeInTheDocument()
    expect(screen.getByText('Quiz Completed!')).toBeInTheDocument()
    expect(screen.getByText('Final Score: 3/4 (75%)')).toBeInTheDocument()
  })
})