import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../utils/test-helpers'
import DescriptionPanel from '@/components/DescriptionPanel'
import type { ImageComponentProps, DescriptionStyle } from '@/types'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Image: ({ className }: { className?: string }) => (
    <div data-testid="image-icon" className={className}>Image</div>
  ),
  Loader2: ({ className }: { className?: string }) => (
    <div data-testid="loader-icon" className={className}>Loader2</div>
  ),
  BookOpen: ({ className }: { className?: string }) => (
    <div data-testid="book-icon" className={className}>BookOpen</div>
  ),
  Feather: ({ className }: { className?: string }) => (
    <div data-testid="feather-icon" className={className}>Feather</div>
  ),
  GraduationCap: ({ className }: { className?: string }) => (
    <div data-testid="graduation-icon" className={className}>GraduationCap</div>
  ),
  MessageCircle: ({ className }: { className?: string }) => (
    <div data-testid="message-icon" className={className}>MessageCircle</div>
  ),
  Baby: ({ className }: { className?: string }) => (
    <div data-testid="baby-icon" className={className}>Baby</div>
  ),
}))

// Mock ProgressIndicator components
vi.mock('@/components/ProgressIndicator', () => ({
  DescriptionProgressIndicator: ({ isGenerating }: { isGenerating: boolean }) => (
    <div data-testid="description-progress">
      {isGenerating ? 'Generating descriptions...' : 'Ready'}
    </div>
  ),
  TextContentSkeleton: ({ lines }: { lines: number }) => (
    <div data-testid="text-skeleton" data-lines={lines}>
      Skeleton with {lines} lines
    </div>
  ),
}))

describe('DescriptionPanel', () => {
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
    description: 'A scenic view of mountains and valleys',
    user: {
      username: 'testuser',
      name: 'Test User'
    },
    width: 1920,
    height: 1080,
    color: '#2563eb',
    created_at: '2024-01-01T00:00:00.000Z'
  }

  const mockGeneratedDescriptions = {
    english: 'A beautiful house with a large garden full of colorful flowers.',
    spanish: 'Una hermosa casa con un jardín grande lleno de flores coloridas.'
  }

  const defaultProps = {
    selectedImage: mockSelectedImage,
    selectedStyle: 'narrativo' as DescriptionStyle,
    generatedDescriptions: mockGeneratedDescriptions,
    isGenerating: false,
    descriptionError: null,
    onStyleChange: vi.fn(),
    onGenerateDescriptions: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the header', () => {
    renderWithProviders(<DescriptionPanel {...defaultProps} />)
    
    expect(screen.getByText('Image Descriptions')).toBeInTheDocument()
  })

  it('should show generate button when image is selected', () => {
    renderWithProviders(<DescriptionPanel {...defaultProps} />)
    
    expect(screen.getByText('Generate Description')).toBeInTheDocument()
  })

  it('should show loading state during generation', () => {
    const loadingProps = { ...defaultProps, isGenerating: true }
    renderWithProviders(<DescriptionPanel {...loadingProps} />)
    
    expect(screen.getByText('Generating...')).toBeInTheDocument()
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
  })

  it('should show style selector when image is present', () => {
    renderWithProviders(<DescriptionPanel {...defaultProps} />)
    
    expect(screen.getByText('Choose your learning style:')).toBeInTheDocument()
    expect(screen.getByText('Narrativo')).toBeInTheDocument()
    expect(screen.getByText('Poetico')).toBeInTheDocument()
    expect(screen.getByText('Academico')).toBeInTheDocument()
    expect(screen.getByText('Conversacional')).toBeInTheDocument()
    expect(screen.getByText('Infantil')).toBeInTheDocument()
  })

  it('should highlight selected style', () => {
    renderWithProviders(<DescriptionPanel {...defaultProps} />)
    
    const narrativoButton = screen.getByText('Narrativo').closest('button')
    expect(narrativoButton).toHaveClass('bg-blue-50', 'border-current', 'text-blue-600')
  })

  it('should call onStyleChange when style is selected', () => {
    renderWithProviders(<DescriptionPanel {...defaultProps} />)
    
    const poeticoButton = screen.getByText('Poetico').closest('button')
    fireEvent.click(poeticoButton!)
    
    expect(defaultProps.onStyleChange).toHaveBeenCalledWith('poetico')
  })

  it('should disable style buttons during generation', () => {
    const generatingProps = { ...defaultProps, isGenerating: true }
    renderWithProviders(<DescriptionPanel {...generatingProps} />)
    
    const narrativoButton = screen.getByText('Narrativo').closest('button')
    expect(narrativoButton).toHaveClass('opacity-50', 'cursor-not-allowed')
  })

  it('should show selected style information', () => {
    renderWithProviders(<DescriptionPanel {...defaultProps} />)
    
    expect(screen.getByText('Selected: Narrativo (Storytelling)')).toBeInTheDocument()
    expect(screen.getByText('Cuenta una historia rica en detalles')).toBeInTheDocument()
  })

  it('should display error message when present', () => {
    const errorProps = { 
      ...defaultProps, 
      descriptionError: 'Failed to generate description' 
    }
    renderWithProviders(<DescriptionPanel {...errorProps} />)
    
    expect(screen.getByText('Failed to generate description')).toBeInTheDocument()
  })

  it('should show progress indicator', () => {
    renderWithProviders(<DescriptionPanel {...defaultProps} />)
    
    expect(screen.getByTestId('description-progress')).toBeInTheDocument()
    expect(screen.getByText('Ready')).toBeInTheDocument()
  })

  it('should show progress indicator during generation', () => {
    const generatingProps = { ...defaultProps, isGenerating: true }
    renderWithProviders(<DescriptionPanel {...generatingProps} />)
    
    expect(screen.getByText('Generating descriptions...')).toBeInTheDocument()
  })

  it('should display English description', () => {
    renderWithProviders(<DescriptionPanel {...defaultProps} />)
    
    expect(screen.getByText('English')).toBeInTheDocument()
    expect(screen.getByText('A beautiful house with a large garden full of colorful flowers.')).toBeInTheDocument()
    expect(screen.getByText('AI Generated')).toBeInTheDocument()
  })

  it('should display Spanish description with style-specific formatting', () => {
    renderWithProviders(<DescriptionPanel {...defaultProps} />)
    
    expect(screen.getByText('Español - Narrativo')).toBeInTheDocument()
    expect(screen.getByText('Una hermosa casa con un jardín grande lleno de flores coloridas.')).toBeInTheDocument()
    expect(screen.getByText('Generado por IA')).toBeInTheDocument()
  })

  it('should show fallback English description when no generated description', () => {
    const noGeneratedProps = {
      ...defaultProps,
      generatedDescriptions: { english: null, spanish: null }
    }
    renderWithProviders(<DescriptionPanel {...noGeneratedProps} />)
    
    expect(screen.getByText('A scenic view of mountains and valleys')).toBeInTheDocument()
  })

  it('should show fallback Spanish description when no generated description', () => {
    const noGeneratedProps = {
      ...defaultProps,
      generatedDescriptions: { english: null, spanish: null }
    }
    renderWithProviders(<DescriptionPanel {...noGeneratedProps} />)
    
    expect(screen.getByText('Haga clic en "Generate Description" para crear descripciones generadas por IA.')).toBeInTheDocument()
  })

  it('should show different style-specific formatting for poetic style', () => {
    const poeticProps = {
      ...defaultProps,
      selectedStyle: 'poetico' as DescriptionStyle,
      generatedDescriptions: {
        english: 'An English description',
        spanish: 'Una descripción poética en español'
      }
    }
    renderWithProviders(<DescriptionPanel {...poeticProps} />)
    
    expect(screen.getByText('Español - Poético')).toBeInTheDocument()
    const spanishText = screen.getByText('Una descripción poética en español')
    expect(spanishText).toHaveClass('italic', 'leading-relaxed')
  })

  it('should show different style-specific formatting for academic style', () => {
    const academicProps = {
      ...defaultProps,
      selectedStyle: 'academico' as DescriptionStyle,
      generatedDescriptions: {
        english: 'An English description',
        spanish: 'Una descripción académica en español'
      }
    }
    renderWithProviders(<DescriptionPanel {...academicProps} />)
    
    expect(screen.getByText('Español - Académico')).toBeInTheDocument()
    const spanishText = screen.getByText('Una descripción académica en español')
    expect(spanishText).toHaveClass('leading-relaxed', 'font-light')
  })

  it('should show different style-specific formatting for child-friendly style', () => {
    const childProps = {
      ...defaultProps,
      selectedStyle: 'infantil' as DescriptionStyle,
      generatedDescriptions: {
        english: 'An English description',
        spanish: 'Una descripción infantil en español'
      }
    }
    renderWithProviders(<DescriptionPanel {...childProps} />)
    
    expect(screen.getByText('Español - Infantil')).toBeInTheDocument()
    const spanishText = screen.getByText('Una descripción infantil en español')
    expect(spanishText).toHaveClass('leading-relaxed', 'text-lg')
  })

  it('should call onGenerateDescriptions when generate button is clicked', () => {
    renderWithProviders(<DescriptionPanel {...defaultProps} />)
    
    const generateButton = screen.getByText('Generate Description')
    fireEvent.click(generateButton)
    
    expect(defaultProps.onGenerateDescriptions).toHaveBeenCalled()
  })

  it('should disable generate button during generation', () => {
    const generatingProps = { ...defaultProps, isGenerating: true }
    renderWithProviders(<DescriptionPanel {...generatingProps} />)
    
    const generateButton = screen.getByText('Generating...').closest('button')
    expect(generateButton).toBeDisabled()
  })

  it('should show message when no image is selected', () => {
    const noImageProps = { ...defaultProps, selectedImage: null as any }
    renderWithProviders(<DescriptionPanel {...noImageProps} />)
    
    expect(screen.getByText('Search and select an image to begin learning.')).toBeInTheDocument()
  })

  it('should not show generate button when no image is selected', () => {
    const noImageProps = { ...defaultProps, selectedImage: null as any }
    renderWithProviders(<DescriptionPanel {...noImageProps} />)
    
    expect(screen.queryByText('Generate Description')).not.toBeInTheDocument()
  })

  it('should not show style selector when no image is selected', () => {
    const noImageProps = { ...defaultProps, selectedImage: null as any }
    renderWithProviders(<DescriptionPanel {...noImageProps} />)
    
    expect(screen.queryByText('Choose your learning style:')).not.toBeInTheDocument()
  })

  it('should show appropriate icons for each style', () => {
    renderWithProviders(<DescriptionPanel {...defaultProps} />)
    
    expect(screen.getByTestId('book-icon')).toBeInTheDocument() // Narrativo
    expect(screen.getByTestId('feather-icon')).toBeInTheDocument() // Poetico
    expect(screen.getByTestId('graduation-icon')).toBeInTheDocument() // Academico
    expect(screen.getByTestId('message-icon')).toBeInTheDocument() // Conversacional
    expect(screen.getByTestId('baby-icon')).toBeInTheDocument() // Infantil
  })

  it('should show style descriptions in tooltips', () => {
    renderWithProviders(<DescriptionPanel {...defaultProps} />)
    
    expect(screen.getByText('Cuenta una historia rica en detalles')).toBeInTheDocument()
    expect(screen.getByText('Lenguaje artístico y metafórico')).toBeInTheDocument()
    expect(screen.getByText('Formal y educativo, vocabulario avanzado')).toBeInTheDocument()
    expect(screen.getByText('Casual y amigable, expresiones coloquiales')).toBeInTheDocument()
    expect(screen.getByText('Simple y divertido para niños')).toBeInTheDocument()
  })

  it('should handle style changes correctly', () => {
    const { rerender } = renderWithProviders(<DescriptionPanel {...defaultProps} />)
    
    // Initially narrativo is selected
    expect(screen.getByText('Selected: Narrativo (Storytelling)')).toBeInTheDocument()
    
    // Change to poetico
    const updatedProps = { ...defaultProps, selectedStyle: 'poetico' as DescriptionStyle }
    rerender(<DescriptionPanel {...updatedProps} />)
    
    expect(screen.getByText('Selected: Poético (Poetic)')).toBeInTheDocument()
  })

  it('should apply correct color scheme for selected style', () => {
    renderWithProviders(<DescriptionPanel {...defaultProps} />)
    
    const selectedStyleInfo = screen.getByText('Selected: Narrativo (Storytelling)').closest('div')
    expect(selectedStyleInfo).toHaveClass('bg-blue-50', 'border-current', 'text-blue-600')
  })
})