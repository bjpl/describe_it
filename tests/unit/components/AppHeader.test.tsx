import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../utils/test-helpers'
import { AppHeader } from '@/components/AppHeader'

const mockProps = {
  canExport: true,
  onToggleSettings: vi.fn(),
  onToggleInfo: vi.fn()
};

describe('AppHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render application title', () => {
    renderWithProviders(<AppHeader {...mockProps} />)
    
    expect(screen.getByText('Describe It')).toBeInTheDocument()
  })

  it('should render settings button', () => {
    renderWithProviders(<AppHeader {...mockProps} />)
    
    const settingsButton = screen.getByRole('button', { name: /settings/i })
    expect(settingsButton).toBeInTheDocument()
  })

  it('should render help button', () => {
    renderWithProviders(<AppHeader {...mockProps} />)
    
    const helpButton = screen.getByRole('button', { name: /help/i })
    expect(helpButton).toBeInTheDocument()
  })

  it('should open settings modal when settings button is clicked', () => {
    renderWithProviders(<AppHeader {...mockProps} />)
    
    const settingsButton = screen.getByRole('button', { name: /settings/i })
    fireEvent.click(settingsButton)
    
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/configuración/i)).toBeInTheDocument()
  })

  it('should open help modal when help button is clicked', () => {
    renderWithProviders(<AppHeader {...mockProps} />)
    
    const helpButton = screen.getByRole('button', { name: /help/i })
    fireEvent.click(helpButton)
    
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/ayuda/i)).toBeInTheDocument()
  })

  it('should close modals when close button is clicked', () => {
    renderWithProviders(<AppHeader {...mockProps} />)
    
    // Open settings modal
    const settingsButton = screen.getByRole('button', { name: /settings/i })
    fireEvent.click(settingsButton)
    
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    
    // Close modal
    const closeButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('should display current language indicator', () => {
    renderWithProviders(<AppHeader {...mockProps} />)
    
    // Should show Spanish by default
    expect(screen.getByText(/es/i)).toBeInTheDocument()
  })

  it('should handle language toggle', () => {
    renderWithProviders(<AppHeader {...mockProps} />)
    
    const languageToggle = screen.getByRole('button', { name: /language/i })
    fireEvent.click(languageToggle)
    
    // Should toggle between Spanish and English
    expect(screen.getByText(/en/i)).toBeInTheDocument()
  })

  it('should be accessible with keyboard navigation', () => {
    renderWithProviders(<AppHeader {...mockProps} />)
    
    const settingsButton = screen.getByRole('button', { name: /settings/i })
    settingsButton.focus()
    
    expect(document.activeElement).toBe(settingsButton)
    
    // Test Enter key
    fireEvent.keyDown(settingsButton, { key: 'Enter', code: 'Enter' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('should have proper ARIA labels', () => {
    renderWithProviders(<AppHeader {...mockProps} />)
    
    const settingsButton = screen.getByRole('button', { name: /settings/i })
    const helpButton = screen.getByRole('button', { name: /help/i })
    
    expect(settingsButton).toHaveAttribute('aria-label')
    expect(helpButton).toHaveAttribute('aria-label')
  })

  it('should display app version information', () => {
    renderWithProviders(<AppHeader {...mockProps} />)
    
    // Open help modal to see version info
    const helpButton = screen.getByRole('button', { name: /help/i })
    fireEvent.click(helpButton)
    
    expect(screen.getByText(/versión/i)).toBeInTheDocument()
  })

  it('should handle responsive design', () => {
    // Mock window resize
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 640, // Mobile width
    })

    renderWithProviders(<AppHeader {...mockProps} />)
    
    // Should still render essential elements on mobile
    expect(screen.getByText('Describe It')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument()
  })

  it('should persist settings across app usage', () => {
    const mockLocalStorage = {
      getItem: vi.fn().mockReturnValue('{"language": "en", "theme": "dark"}'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    }
    
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
    })

    renderWithProviders(<AppHeader {...mockProps} />)
    
    // Should load saved language preference
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('describe-it-settings')
  })
})