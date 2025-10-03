import { render, screen, fireEvent } from '@testing-library/react';
import { GeneralSettings } from '@/components/Settings/GeneralSettings';
import { AppSettings } from '@/lib/settings/settingsManager';

const mockSettings: AppSettings = {
  performance: {
    imageQuality: 'medium',
    preloadImages: true,
    analyticsEnabled: false,
  },
  apiKeys: {
    unsplash: '',
    openai: '',
  },
  language: {
    ui: 'en',
    target: 'spanish',
  },
  study: {
    dailyGoal: 10,
    difficulty: 'intermediate',
    enableReminders: false,
    reminderTimes: [],
    autoAdvance: true,
  },
  theme: {
    mode: 'light',
    customColors: {
      primary: '#3b82f6',
      secondary: '#64748b',
      accent: '#06b6d4',
    },
    animations: true,
    reducedMotion: false,
  },
  accessibility: {
    fontSize: 'medium',
    contrast: 'normal',
    screenReader: false,
    keyboardNavigation: true,
    focusIndicator: true,
  },
  cache: {
    maxSize: 50,
    autoClean: true,
    retention: 7,
  },
  backup: {
    autoBackup: false,
    backupFrequency: 'weekly',
    includeAPIKeys: false,
  },
};

const defaultProps = {
  settings: mockSettings,
  darkMode: false,
  onToggleDarkMode: jest.fn(),
  onSettingChange: jest.fn(),
};

describe('GeneralSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders general settings section', () => {
    render(<GeneralSettings {...defaultProps} />);
    
    expect(screen.getByText('General Settings')).toBeInTheDocument();
    expect(screen.getByText('Dark Mode')).toBeInTheDocument();
    expect(screen.getByText('Performance')).toBeInTheDocument();
  });

  it('displays dark mode toggle', () => {
    render(<GeneralSettings {...defaultProps} />);
    
    const darkModeToggle = screen.getByRole('button');
    expect(darkModeToggle).toBeInTheDocument();
    
    fireEvent.click(darkModeToggle);
    expect(defaultProps.onToggleDarkMode).toHaveBeenCalled();
  });

  it('displays correct dark mode state', () => {
    const { rerender } = render(<GeneralSettings {...defaultProps} darkMode={false} />);
    
    let toggleButton = screen.getByRole('button');
    expect(toggleButton).toHaveClass('bg-gray-200');
    
    rerender(<GeneralSettings {...defaultProps} darkMode={true} />);
    toggleButton = screen.getByRole('button');
    expect(toggleButton).toHaveClass('bg-blue-600');
  });

  it('renders image quality selector', () => {
    render(<GeneralSettings {...defaultProps} />);
    
    const imageQualitySelect = screen.getByDisplayValue('Medium');
    expect(imageQualitySelect).toBeInTheDocument();
    
    fireEvent.change(imageQualitySelect, { target: { value: 'high' } });
    expect(defaultProps.onSettingChange).toHaveBeenCalledWith('performance', {
      imageQuality: 'high',
    });
  });

  it('renders preload images checkbox', () => {
    render(<GeneralSettings {...defaultProps} />);
    
    const preloadCheckbox = screen.getByRole('checkbox', { name: /preload images/i });
    expect(preloadCheckbox).toBeChecked();
    
    fireEvent.click(preloadCheckbox);
    expect(defaultProps.onSettingChange).toHaveBeenCalledWith('performance', {
      preloadImages: false,
    });
  });

  it('renders analytics checkbox', () => {
    render(<GeneralSettings {...defaultProps} />);
    
    const analyticsCheckbox = screen.getByRole('checkbox', { name: /enable analytics/i });
    expect(analyticsCheckbox).not.toBeChecked();
    
    fireEvent.click(analyticsCheckbox);
    expect(defaultProps.onSettingChange).toHaveBeenCalledWith('performance', {
      analyticsEnabled: true,
    });
  });

  it('displays proper labels and descriptions', () => {
    render(<GeneralSettings {...defaultProps} />);
    
    expect(screen.getByText('Toggle between light and dark themes')).toBeInTheDocument();
    expect(screen.getByText('Image Quality')).toBeInTheDocument();
    expect(screen.getByText('Preload Images')).toBeInTheDocument();
    expect(screen.getByText('Enable Analytics')).toBeInTheDocument();
  });
});