import { render, screen, waitFor, fireEvent, RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect, vi } from 'vitest'

// Test wrapper for React Query
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
    },
  })
}

export function TestQueryProvider({ children }: { children: React.ReactNode }) {
  const testQueryClient = createTestQueryClient()
  
  return (
    <QueryClientProvider client={testQueryClient}>
      {children}
    </QueryClientProvider>
  )
}

// Custom render with providers
export function renderWithProviders(ui: ReactElement, options = {}) {
  const testQueryClient = createTestQueryClient()
  
  const Wrapper = ({ children }: { children?: React.ReactNode }) => (
    <QueryClientProvider client={testQueryClient}>
      {children}
    </QueryClientProvider>
  )

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...options }),
  }
}

// Helper to wait for loading states
export async function waitForLoadingToFinish() {
  await waitFor(() => {
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
  })
}

// Mock API responses helper
export function createMockApiResponse(data: any, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  }
}

// Wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

// Mock image URL helper
export const createMockImageUrl = (id = 'test-image') => `https://example.com/images/${id}.jpg`

// Mock search response helper
export function createMockSearchResponse(count = 3) {
  return {
    success: true,
    data: {
      images: Array.from({ length: count }, (_, i) => ({
        id: `image-${i}`,
        urls: {
          regular: createMockImageUrl(`image-${i}`),
          small: createMockImageUrl(`image-${i}-small`),
        },
        alt_description: `Test image ${i}`,
      })),
    },
  }
}