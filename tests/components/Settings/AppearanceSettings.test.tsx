import { render, screen, fireEvent } from '@testing-library/react';
import { AppearanceSettings } from '@/components/Settings/AppearanceSettings';
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
  onSettingChange: jest.fn(),
};

describe('AppearanceSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders appearance settings section', () => {
    render(<AppearanceSettings {...defaultProps} />);
    
    expect(screen.getByText('Theme Customization')).toBeInTheDocument();
    expect(screen.getByText('Theme Mode')).toBeInTheDocument();
    expect(screen.getByText('Custom Colors')).toBeInTheDocument();
  });

  it('renders theme mode selector', () => {
    render(<AppearanceSettings {...defaultProps} />);
    
    const themeModeSelect = screen.getByDisplayValue('Light');
    expect(themeModeSelect).toBeInTheDocument();
    
    fireEvent.change(themeModeSelect, { target: { value: 'dark' } });
    expect(defaultProps.onSettingChange).toHaveBeenCalledWith('theme', {
      mode: 'dark',
    });
  });

  it('renders color inputs for primary, secondary, and accent colors', () => {
    render(<AppearanceSettings {...defaultProps} />);
    
    const primaryColorInput = screen.getByDisplayValue('#3b82f6');
    const secondaryColorInput = screen.getByDisplayValue('#64748b');
    const accentColorInput = screen.getByDisplayValue('#06b6d4');
    
    expect(primaryColorInput).toBeInTheDocument();
    expect(secondaryColorInput).toBeInTheDocument();
    expect(accentColorInput).toBeInTheDocument();
  });

  it('updates primary color when changed', () => {
    render(<AppearanceSettings {...defaultProps} />);
    
    const primaryColorInput = screen.getByDisplayValue('#3b82f6');
    fireEvent.change(primaryColorInput, { target: { value: '#ff0000' } });
    
    expect(defaultProps.onSettingChange).toHaveBeenCalledWith('theme', {
      customColors: {
        primary: '#ff0000',
        secondary: '#64748b',
        accent: '#06b6d4',
      },
    });
  });

  it('renders animation preferences', () => {
    render(<AppearanceSettings {...defaultProps} />);
    
    const animationsCheckbox = screen.getByRole('checkbox', { name: /animations/i });
    const reducedMotionCheckbox = screen.getByRole('checkbox', { name: /reduced motion/i });
    
    expect(animationsCheckbox).toBeChecked();
    expect(reducedMotionCheckbox).not.toBeChecked();
    
    fireEvent.click(animationsCheckbox);
    expect(defaultProps.onSettingChange).toHaveBeenCalledWith('theme', {
      animations: false,
    });
    
    fireEvent.click(reducedMotionCheckbox);
    expect(defaultProps.onSettingChange).toHaveBeenCalledWith('theme', {
      reducedMotion: true,
    });
  });

  it('renders accessibility settings', () => {
    render(<AppearanceSettings {...defaultProps} />);
    
    expect(screen.getByText('Accessibility')).toBeInTheDocument();
    expect(screen.getByText('Font Size')).toBeInTheDocument();
    expect(screen.getByText('Contrast')).toBeInTheDocument();
  });

  it('updates font size when changed', () => {
    render(<AppearanceSettings {...defaultProps} />);
    
    const fontSizeSelect = screen.getByDisplayValue('Medium');
    fireEvent.change(fontSizeSelect, { target: { value: 'large' } });
    
    expect(defaultProps.onSettingChange).toHaveBeenCalledWith('accessibility', {
      fontSize: 'large',
    });
  });

  it('updates contrast when changed', () => {
    render(<AppearanceSettings {...defaultProps} />);
    
    const contrastSelect = screen.getByDisplayValue('Normal');
    fireEvent.change(contrastSelect, { target: { value: 'high' } });
    
    expect(defaultProps.onSettingChange).toHaveBeenCalledWith('accessibility', {
      contrast: 'high',
    });
  });

  it('displays proper labels and descriptions', () => {
    render(<AppearanceSettings {...defaultProps} />);
    
    expect(screen.getByText('Enable interface animations')).toBeInTheDocument();
    expect(screen.getByText('Minimize motion for accessibility')).toBeInTheDocument();
    expect(screen.getByLabelText('Primary')).toBeInTheDocument();
    expect(screen.getByLabelText('Secondary')).toBeInTheDocument();
    expect(screen.getByLabelText('Accent')).toBeInTheDocument();
  });
});