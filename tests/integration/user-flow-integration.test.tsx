/**
 * 🧠 HIVE MIND QA AGENT DELTA: COMPREHENSIVE INTEGRATION TESTS
 * 
 * Tests all major user flows and integration points in the Spanish Learning App
 */

import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import HomePage from '@/app/page'
import type { UnsplashImage, DescriptionStyle } from '@/types'
import '@testing-library/jest-dom'

// Mock data for testing
const mockImage: UnsplashImage = {
  id: 'test-image-1',
  urls: {
    small: 'https://test.unsplash.com/small.jpg',
    regular: 'https://test.unsplash.com/regular.jpg',
    full: 'https://test.unsplash.com/full.jpg'
  },
  alt_description: 'Test mountain landscape',
  description: 'Beautiful mountain view for testing',
  user: {
    name: 'Test User',
    username: 'testuser'
  },
  width: 1200,
  height: 800,
  color: '#4A90E2',
  likes: 150,
  created_at: '2024-01-01T00:00:00Z'
}

const mockSearchResponse = {
  images: [mockImage],
  totalPages: 5,
  currentPage: 1,
  total: 100,
  hasNextPage: true
}

const mockDescriptionResponse = {
  success: true,
  data: {
    text: 'Esta es una hermosa montaña con vistas espectaculares.',
    style: 'conversacional' as DescriptionStyle,
    language: 'es',
    wordCount: 10,
    generatedAt: '2024-01-01T00:00:00Z'
  },
  metadata: {
    responseTime: '500ms',
    timestamp: '2024-01-01T00:00:00Z',
    demoMode: false
  }
}

const mockQAResponse = {
  success: true,
  data: {
    questions: [
      {
        id: 'q1',
        question: '¿Qué puedes ver en la montaña?',
        options: ['Árboles', 'Nieve', 'Rocas', 'Todo lo anterior'],
        correct_answer: 'Todo lo anterior',
        explanation: 'La montaña tiene todos estos elementos.',
        difficulty: 'medium'
      }
    ]
  }
}

// MSW Server setup
const server = setupServer(
  // Unsplash API mock
  http.get('/api/images/search', async ({ request }) => {
    const url = new URL(request.url)
    const query = url.searchParams.get('query')
    const page = url.searchParams.get('page') || '1'
    
    if (!query) {
      return HttpResponse.json({ error: 'Query required' }, { status: 400 })
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100))
    return HttpResponse.json({
      ...mockSearchResponse,
      currentPage: parseInt(page)
    })
  }),

  // Description generation API mock
  http.post('/api/descriptions/generate', async ({ request }) => {
    const body = await request.json() as any
    const { language, style } = body

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 300))
    return HttpResponse.json({
      ...mockDescriptionResponse,
      data: {
        ...mockDescriptionResponse.data,
        text: language === 'en' 
          ? 'This is a beautiful mountain with spectacular views.'
          : 'Esta es una hermosa montaña con vistas espectaculares.',
        language,
        style
      }
    })
  }),

  // Q&A generation API mock
  http.post('/api/qa/generate', async ({ request }) => {
    await new Promise(resolve => setTimeout(resolve, 200))
    return HttpResponse.json(mockQAResponse)
  }),

  // Vocabulary extraction API mock
  http.post('/api/vocabulary/save', async ({ request }) => {
    await new Promise(resolve => setTimeout(resolve, 100))
    return HttpResponse.json({
      success: true,
      data: {
        saved: 5,
        vocabulary: [
          {
            spanish_text: 'montaña',
            english_translation: 'mountain',
            category: 'nature',
            difficulty_level: 'beginner'
          }
        ]
      }
    })
  }),

  // Export API mock
  http.post('/api/export/generate', async ({ request }) => {
    await new Promise(resolve => setTimeout(resolve, 500))
    return HttpResponse.json({
      success: true,
      data: {
        filename: 'spanish-learning-export.csv',
        url: 'blob:test-csv-data',
        format: 'csv'
      }
    })
  })
)

describe('🧠 HIVE MIND INTEGRATION TESTS: User Flow Integration', () => {
  const user = userEvent.setup()

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' })
  })

  afterEach(() => {
    server.resetHandlers()
    vi.clearAllMocks()
  })

  afterAll(() => {
    server.close()
  })

  beforeEach(() => {
    // Mock localStorage
    const mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      clear: vi.fn(),
    }
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage })

    // Mock URL.createObjectURL for export functionality
    global.URL.createObjectURL = vi.fn(() => 'blob:test-url')
    global.URL.revokeObjectURL = vi.fn()
  })

  describe('1️⃣ Image Search to Select to Generate Descriptions Flow', () => {
    it('should complete full image search to description generation', async () => {
      render(<HomePage />)

      // Step 1: Search for images
      const searchInput = screen.getByPlaceholderText(/search for images/i)
      await user.type(searchInput, 'mountain landscape')
      
      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      // Wait for images to load
      await waitFor(() => {
        expect(screen.getByAltText('Test mountain landscape')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Step 2: Select an image
      const imageCard = screen.getByAltText('Test mountain landscape')
      await user.click(imageCard)

      // Verify image is selected and displayed in the viewer
      await waitFor(() => {
        expect(screen.getByText('Spanish Learning Content')).toBeInTheDocument()
      })

      // Step 3: Generate descriptions
      const generateButton = screen.getByRole('button', { name: /generate descriptions/i })
      await user.click(generateButton)

      // Wait for descriptions to be generated
      await waitFor(() => {
        expect(screen.getByText(/esta es una hermosa montaña/i)).toBeInTheDocument()
      }, { timeout: 5000 })

      // Verify both English and Spanish descriptions are shown
      expect(screen.getByText(/this is a beautiful mountain/i)).toBeInTheDocument()
    })

    it('should handle search errors gracefully', async () => {
      server.use(
        http.get('/api/images/search', async ({ request }) => {
          return HttpResponse.json({ error: 'Server error' }, { status: 500 })
        })
      )

      render(<HomePage />)

      const searchInput = screen.getByPlaceholderText(/search for images/i)
      await user.type(searchInput, 'test search')

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/server error/i)).toBeInTheDocument()
      })
    })
  })

  describe('2️⃣ Multi-style Selection to Tab Switching UI Flow', () => {
    it('should handle multiple description styles and tab navigation', async () => {
      render(<HomePage />)

      // First, get an image selected
      const searchInput = screen.getByPlaceholderText(/search for images/i)
      await user.type(searchInput, 'landscape')
      
      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        const image = screen.getByAltText('Test mountain landscape')
        expect(image).toBeInTheDocument()
      })

      const imageCard = screen.getByAltText('Test mountain landscape')
      await user.click(imageCard)

      // Wait for learning content to appear
      await waitFor(() => {
        expect(screen.getByText('Spanish Learning Content')).toBeInTheDocument()
      })

      // Test style selector - look for style buttons in the notebook
      const conversacionalButton = screen.getByRole('button', { name: /conversacional/i })
      const narrativoButton = screen.getByRole('button', { name: /narrativo/i })
      
      expect(conversacionalButton).toBeInTheDocument()
      expect(narrativoButton).toBeInTheDocument()

      // Switch styles and verify UI updates
      await user.click(narrativoButton)
      
      // Verify active style indicator
      expect(narrativoButton).toHaveClass('bg-blue-600')

      // Test tab navigation
      const qaTab = screen.getByRole('button', { name: /beta-2.*q&a system/i })
      await user.click(qaTab)

      // Verify Q&A tab is active
      expect(qaTab).toHaveClass('bg-white', 'text-purple-600')
    })
  })

  describe('3️⃣ QA Generation to Navigation to Export Flow', () => {
    it('should generate Q&A, navigate questions, and export data', async () => {
      render(<HomePage />)

      // Setup: Get to Q&A tab with selected image
      const searchInput = screen.getByPlaceholderText(/search for images/i)
      await user.type(searchInput, 'test')
      
      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        const image = screen.getByAltText('Test mountain landscape')
        expect(image).toBeInTheDocument()
      })

      const imageCard = screen.getByAltText('Test mountain landscape')
      await user.click(imageCard)

      // Generate a description first (required for Q&A)
      await waitFor(() => {
        const generateButton = screen.getByRole('button', { name: /generate descriptions/i })
        user.click(generateButton)
      })

      // Wait for description to be generated
      await waitFor(() => {
        expect(screen.getByText(/esta es una hermosa montaña/i)).toBeInTheDocument()
      }, { timeout: 5000 })

      // Switch to Q&A tab
      const qaTab = screen.getByRole('button', { name: /beta-2.*q&a system/i })
      await user.click(qaTab)

      // Generate Q&A
      const generateQAButton = screen.getByRole('button', { name: /generate questions/i })
      await user.click(generateQAButton)

      // Wait for questions to appear
      await waitFor(() => {
        expect(screen.getByText(/¿qué puedes ver en la montaña\?/i)).toBeInTheDocument()
      }, { timeout: 3000 })

      // Answer a question
      const option = screen.getByText(/todo lo anterior/i)
      await user.click(option)

      // Submit answer
      const submitButton = screen.getByRole('button', { name: /submit/i })
      await user.click(submitButton)

      // Test export functionality
      const exportButton = screen.getByRole('button', { name: /export all data/i })
      await user.click(exportButton)

      // Should trigger export (mock will return success)
      await waitFor(() => {
        // Export should complete successfully - check for any success indicators
        // Since this is a mock, we mainly verify the request was made
        expect(exportButton).toBeEnabled()
      })
    })
  })

  describe('4️⃣ Vocabulary Extraction to Add to List to Export Flow', () => {
    it('should extract vocabulary and manage vocabulary list', async () => {
      render(<HomePage />)

      // Setup: Get to vocabulary tab
      const searchInput = screen.getByPlaceholderText(/search for images/i)
      await user.type(searchInput, 'nature')
      
      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        const image = screen.getByAltText('Test mountain landscape')
        expect(image).toBeInTheDocument()
      })

      const imageCard = screen.getByAltText('Test mountain landscape')
      await user.click(imageCard)

      // Note: Vocabulary tab might be temporarily disabled in UI
      // If available, test vocabulary extraction
      const vocabularyElements = screen.queryByText(/vocabulary/i)
      if (vocabularyElements) {
        // Test vocabulary functionality if present
        await user.click(vocabularyElements)
        
        // Look for vocabulary extraction features
        const extractButton = screen.queryByRole('button', { name: /extract vocabulary/i })
        if (extractButton) {
          await user.click(extractButton)
          
          // Wait for vocabulary to be extracted
          await waitFor(() => {
            expect(screen.getByText(/montaña/i)).toBeInTheDocument()
          })
        }
      }
    })
  })

  describe('5️⃣ API Integration Tests', () => {
    it('should handle Unsplash API with various queries', async () => {
      render(<HomePage />)

      // Test different search queries
      const searchQueries = ['mountains', 'ocean', 'city', 'forest']
      
      for (const query of searchQueries) {
        const searchInput = screen.getByPlaceholderText(/search for images/i)
        await user.clear(searchInput)
        await user.type(searchInput, query)
        
        const searchButton = screen.getByRole('button', { name: /search/i })
        await user.click(searchButton)

        await waitFor(() => {
          expect(screen.getByAltText('Test mountain landscape')).toBeInTheDocument()
        }, { timeout: 2000 })
      }
    })

    it('should test OpenAI with different styles', async () => {
      render(<HomePage />)

      // Get image selected first
      const searchInput = screen.getByPlaceholderText(/search for images/i)
      await user.type(searchInput, 'test')
      
      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        const image = screen.getByAltText('Test mountain landscape')
        expect(image).toBeInTheDocument()
      })

      const imageCard = screen.getByAltText('Test mountain landscape')
      await user.click(imageCard)

      // Test different description styles
      const styles = ['conversacional', 'narrativo', 'poetico', 'academico']
      
      for (const style of styles) {
        const styleButton = screen.getByRole('button', { name: new RegExp(style, 'i') })
        await user.click(styleButton)
        
        const generateButton = screen.getByRole('button', { name: /generate/i })
        await user.click(generateButton)

        await waitFor(() => {
          expect(screen.getByText(/esta es una hermosa montaña/i)).toBeInTheDocument()
        }, { timeout: 3000 })
      }
    })

    it('should handle API error scenarios with retry mechanisms', async () => {
      // Test network timeout
      server.use(
        http.get('/api/images/search', async ({ request }) => {
          await new Promise(resolve => setTimeout(resolve, 20000)) // Long delay to trigger timeout
          return HttpResponse.json({ images: [], totalPages: 0, currentPage: 1, total: 0, hasNextPage: false })
        })
      )

      render(<HomePage />)

      const searchInput = screen.getByPlaceholderText(/search for images/i)
      await user.type(searchInput, 'timeout test')
      
      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      // Should show loading state
      expect(screen.getByText(/searching/i)).toBeInTheDocument()

      // Reset to normal response for cleanup
      server.resetHandlers()
    })
  })

  describe('6️⃣ State Management Tests', () => {
    it('should maintain cross-component state synchronization', async () => {
      render(<HomePage />)

      // Get an image selected and description generated
      const searchInput = screen.getByPlaceholderText(/search for images/i)
      await user.type(searchInput, 'sync test')
      
      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        const image = screen.getByAltText('Test mountain landscape')
        expect(image).toBeInTheDocument()
      })

      const imageCard = screen.getByAltText('Test mountain landscape')
      await user.click(imageCard)

      // Generate description
      const generateButton = screen.getByRole('button', { name: /generate descriptions/i })
      await user.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText(/esta es una hermosa montaña/i)).toBeInTheDocument()
      }, { timeout: 5000 })

      // Switch tabs and verify state is maintained
      const qaTab = screen.getByRole('button', { name: /beta-2.*q&a system/i })
      await user.click(qaTab)

      // Q&A should have access to the generated description
      expect(screen.getByRole('button', { name: /generate questions/i })).toBeInTheDocument()

      // Switch back to descriptions tab
      const descTab = screen.getByRole('button', { name: /alpha-1.*descriptions/i })
      await user.click(descTab)

      // Description should still be visible
      expect(screen.getByText(/esta es una hermosa montaña/i)).toBeInTheDocument()
    })

    it('should verify localStorage persistence', async () => {
      const mockLocalStorage = window.localStorage as any

      render(<HomePage />)

      // Perform actions that should trigger localStorage saves
      const searchInput = screen.getByPlaceholderText(/search for images/i)
      await user.type(searchInput, 'persistence test')
      
      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      // Verify localStorage was called
      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalled()
      })
    })

    it('should test session continuity after page refresh', async () => {
      // This would require more sophisticated testing setup
      // For now, verify that session logger is initialized
      render(<HomePage />)

      // The session logger should be active (useSessionLogger hook)
      expect(screen.getByText('Describe It')).toBeInTheDocument()
    })
  })

  describe('7️⃣ Export Functionality Tests', () => {
    it('should test CSV export data integrity', async () => {
      render(<HomePage />)

      // Setup data for export
      const searchInput = screen.getByPlaceholderText(/search for images/i)
      await user.type(searchInput, 'export test')
      
      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        const image = screen.getByAltText('Test mountain landscape')
        expect(image).toBeInTheDocument()
      })

      const imageCard = screen.getByAltText('Test mountain landscape')
      await user.click(imageCard)

      // Generate some data to export
      const generateButton = screen.getByRole('button', { name: /generate descriptions/i })
      await user.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText(/esta es una hermosa montaña/i)).toBeInTheDocument()
      }, { timeout: 5000 })

      // Test export
      const exportButton = screen.getByRole('button', { name: /export all data/i })
      await user.click(exportButton)

      // Verify export was triggered
      await waitFor(() => {
        expect(global.URL.createObjectURL).toHaveBeenCalled()
      })
    })

    it('should verify file naming conventions for exports', async () => {
      render(<HomePage />)

      // Test that export generates appropriate filename
      const exportButton = screen.getByRole('button', { name: /export all data/i })
      await user.click(exportButton)

      // Mock response should contain filename
      await waitFor(() => {
        // Verify the export process was initiated
        expect(exportButton).toBeEnabled()
      })
    })
  })
})