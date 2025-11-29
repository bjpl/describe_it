import { describe, it, expect, vi, beforeEach } from 'vitest'
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

    const settingsButton = screen.getByTitle('Settings')
    expect(settingsButton).toBeInTheDocument()
  })

  it('should render about/info button', () => {
    renderWithProviders(<AppHeader {...mockProps} />)

    const infoButton = screen.getByTitle('About')
    expect(infoButton).toBeInTheDocument()
  })

  it('should call onToggleSettings when settings button is clicked', () => {
    renderWithProviders(<AppHeader {...mockProps} />)

    const settingsButton = screen.getByTitle('Settings')
    fireEvent.click(settingsButton)

    expect(mockProps.onToggleSettings).toHaveBeenCalledTimes(1)
  })

  it('should call onToggleInfo when about button is clicked', () => {
    renderWithProviders(<AppHeader {...mockProps} />)

    const infoButton = screen.getByTitle('About')
    fireEvent.click(infoButton)

    expect(mockProps.onToggleInfo).toHaveBeenCalledTimes(1)
  })

  it('should render export button', () => {
    renderWithProviders(<AppHeader {...mockProps} />)

    const exportButton = screen.getByTitle('Export session data in multiple formats')
    expect(exportButton).toBeInTheDocument()
    expect(exportButton).not.toBeDisabled()
  })

  it('should disable export button when canExport is false', () => {
    renderWithProviders(<AppHeader {...mockProps} canExport={false} />)

    const exportButton = screen.getByTitle('Use the app to generate some data first')
    expect(exportButton).toBeInTheDocument()
    expect(exportButton).toBeDisabled()
  })

  it('should render analytics report button', () => {
    renderWithProviders(<AppHeader {...mockProps} />)

    const analyticsButton = screen.getByTitle('View Session Analytics Report')
    expect(analyticsButton).toBeInTheDocument()
  })

  it('should be accessible with keyboard navigation', () => {
    renderWithProviders(<AppHeader {...mockProps} />)

    const settingsButton = screen.getByTitle('Settings')
    settingsButton.focus()

    expect(document.activeElement).toBe(settingsButton)
  })

  it('should have focus styles on buttons', () => {
    renderWithProviders(<AppHeader {...mockProps} />)

    const settingsButton = screen.getByTitle('Settings')
    expect(settingsButton).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500')
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
    expect(screen.getByTitle('Settings')).toBeInTheDocument()
  })

  it('should display subtitle', () => {
    renderWithProviders(<AppHeader {...mockProps} />)

    expect(screen.getByText('Spanish Learning through Images')).toBeInTheDocument()
  })

  it('should render all action buttons', () => {
    renderWithProviders(<AppHeader {...mockProps} />)

    expect(screen.getByTitle('View Session Analytics Report')).toBeInTheDocument()
    expect(screen.getByTitle('Export session data in multiple formats')).toBeInTheDocument()
    expect(screen.getByTitle('Settings')).toBeInTheDocument()
    expect(screen.getByTitle('About')).toBeInTheDocument()
  })
})