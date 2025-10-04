import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ApiKeyProvider, type ApiKeyConfig } from '@/lib/api/keyProvider';
import { settingsManager } from '@/lib/settings/settingsManager';

// Mock settingsManager
vi.mock('@/lib/settings/settingsManager', () => ({
  settingsManager: {
    getSettings: vi.fn(),
    addListener: vi.fn(),
  },
}));

// Mock environment variables
const mockEnv = {
  OPENAI_API_KEY: 'env-openai-key',
  NEXT_PUBLIC_UNSPLASH_ACCESS_KEY: 'env-unsplash-key',
};

describe('ApiKeyProvider', () => {
  let mockGetSettings: ReturnType<typeof vi.fn>;
  let mockAddListener: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup settingsManager mocks
    mockGetSettings = vi.mocked(settingsManager.getSettings);
    mockAddListener = vi.mocked(settingsManager.addListener);
    
    // Mock process.env
    vi.stubGlobal('process', {
      env: mockEnv
    });

    // Setup default mock return values
    mockAddListener.mockReturnValue(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Key Priority System', () => {
    it('should prioritize settings keys over environment variables', () => {
      // Arrange
      mockGetSettings.mockReturnValue({
        apiKeys: {
          openai: 'settings-openai-key',
          unsplash: 'settings-unsplash-key',
        },
      } as any);

      const provider = new ApiKeyProvider();

      // Act
      const openaiKey = provider.getKey('openai');
      const unsplashKey = provider.getKey('unsplash');

      // Assert
      expect(openaiKey).toBe('settings-openai-key');
      expect(unsplashKey).toBe('settings-unsplash-key');
    });

    it('should fallback to environment variables when settings keys are empty', () => {
      // Arrange
      mockGetSettings.mockReturnValue({
        apiKeys: {
          openai: '',
          unsplash: '',
        },
      } as any);

      const provider = new ApiKeyProvider();

      // Act
      const openaiKey = provider.getKey('openai');
      const unsplashKey = provider.getKey('unsplash');

      // Assert
      expect(openaiKey).toBe('env-openai-key');
      expect(unsplashKey).toBe('env-unsplash-key');
    });

    it('should return empty string when no keys are available', () => {
      // Arrange
      mockGetSettings.mockReturnValue({
        apiKeys: {
          openai: '',
          unsplash: '',
        },
      } as any);
      
      vi.stubGlobal('process', { env: {} });

      const provider = new ApiKeyProvider();

      // Act
      const openaiKey = provider.getKey('openai');
      const unsplashKey = provider.getKey('unsplash');

      // Assert
      expect(openaiKey).toBe('');
      expect(unsplashKey).toBe('');
    });

    it('should handle mixed scenarios correctly', () => {
      // Arrange - settings has OpenAI key but not Unsplash
      mockGetSettings.mockReturnValue({
        apiKeys: {
          openai: 'settings-openai-key',
          unsplash: '',
        },
      } as any);

      const provider = new ApiKeyProvider();

      // Act
      const openaiKey = provider.getKey('openai');
      const unsplashKey = provider.getKey('unsplash');

      // Assert
      expect(openaiKey).toBe('settings-openai-key');
      expect(unsplashKey).toBe('env-unsplash-key');
    });
  });

  describe('Key Validation', () => {
    it('should validate OpenAI key format', () => {
      mockGetSettings.mockReturnValue({
        apiKeys: { openai: '', unsplash: '' },
      } as any);

      const provider = new ApiKeyProvider();

      // Valid OpenAI key format
      expect(provider.validateKey('openai', 'sk-1234567890abcdef1234567890abcdef1234567890')).toBe(true);
      
      // Invalid formats
      expect(provider.validateKey('openai', 'invalid-key')).toBe(false);
      expect(provider.validateKey('openai', 'sk-short')).toBe(false);
      expect(provider.validateKey('openai', '')).toBe(false);
      expect(provider.validateKey('openai', 'sk-example-key')).toBe(false);
    });

    it('should validate Unsplash key format', () => {
      mockGetSettings.mockReturnValue({
        apiKeys: { openai: '', unsplash: '' },
      } as any);

      const provider = new ApiKeyProvider();

      // Valid Unsplash key format (alphanumeric, 20+ chars)
      expect(provider.validateKey('unsplash', 'abcdef1234567890abcdef1234567890abcdef12')).toBe(true);
      
      // Invalid formats
      expect(provider.validateKey('unsplash', 'short')).toBe(false);
      expect(provider.validateKey('unsplash', 'invalid-chars-!')).toBe(false);
      expect(provider.validateKey('unsplash', '')).toBe(false);
    });

    it('should handle unknown service types', () => {
      mockGetSettings.mockReturnValue({
        apiKeys: { openai: '', unsplash: '' },
      } as any);

      const provider = new ApiKeyProvider();

      expect(() => provider.validateKey('unknown' as any, 'key')).toThrow('Unknown service type: unknown');
    });
  });

  describe('Key Updates and Notifications', () => {
    it('should register settings listener on initialization', () => {
      // Arrange
      mockGetSettings.mockReturnValue({
        apiKeys: { openai: '', unsplash: '' },
      } as any);

      // Act
      new ApiKeyProvider();

      // Assert
      expect(mockAddListener).toHaveBeenCalledTimes(1);
      expect(mockAddListener).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should notify listeners when keys change', () => {
      // Arrange
      mockGetSettings.mockReturnValue({
        apiKeys: { openai: '', unsplash: '' },
      } as any);

      const provider = new ApiKeyProvider();
      const listener = vi.fn();
      provider.addListener(listener);

      // Simulate settings change
      const settingsListener = mockAddListener.mock.calls[0][0];
      settingsListener({
        apiKeys: {
          openai: 'new-openai-key',
          unsplash: 'new-unsplash-key',
        },
      } as any);

      // Assert
      expect(listener).toHaveBeenCalledWith({
        openai: 'new-openai-key',
        unsplash: 'new-unsplash-key',
      });
    });

    it('should remove listeners correctly', () => {
      // Arrange
      mockGetSettings.mockReturnValue({
        apiKeys: { openai: '', unsplash: '' },
      } as any);

      const provider = new ApiKeyProvider();
      const listener = vi.fn();
      const unsubscribe = provider.addListener(listener);

      // Act
      unsubscribe();

      // Simulate settings change
      const settingsListener = mockAddListener.mock.calls[0][0];
      settingsListener({
        apiKeys: {
          openai: 'new-key',
          unsplash: 'new-key',
        },
      } as any);

      // Assert
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Demo Mode Detection', () => {
    it('should detect demo mode when no valid keys are available', () => {
      // Arrange
      mockGetSettings.mockReturnValue({
        apiKeys: {
          openai: '',
          unsplash: '',
        },
      } as any);
      
      vi.stubGlobal('process', { env: {} });

      const provider = new ApiKeyProvider();

      // Act & Assert
      expect(provider.isInDemoMode('openai')).toBe(true);
      expect(provider.isInDemoMode('unsplash')).toBe(true);
    });

    it('should not be in demo mode when valid keys are available', () => {
      // Arrange
      mockGetSettings.mockReturnValue({
        apiKeys: {
          openai: 'sk-validkey1234567890abcdef1234567890abcdef',
          unsplash: 'validkey1234567890abcdef1234567890abcdef12',
        },
      } as any);

      const provider = new ApiKeyProvider();

      // Act & Assert
      expect(provider.isInDemoMode('openai')).toBe(false);
      expect(provider.isInDemoMode('unsplash')).toBe(false);
    });
  });

  describe('Service Configuration', () => {
    it('should provide complete configuration for services', () => {
      // Arrange
      mockGetSettings.mockReturnValue({
        apiKeys: {
          openai: 'sk-validkey1234567890abcdef1234567890abcdef',
          unsplash: 'validkey1234567890abcdef1234567890abcdef12',
        },
      } as any);

      const provider = new ApiKeyProvider();

      // Act
      const config = provider.getServiceConfig('openai');

      // Assert
      expect(config).toEqual({
        apiKey: 'sk-validkey1234567890abcdef1234567890abcdef',
        isValid: true,
        source: 'settings',
        isDemo: false,
      });
    });

    it('should indicate environment source correctly', () => {
      // Arrange
      mockGetSettings.mockReturnValue({
        apiKeys: {
          openai: '',
          unsplash: '',
        },
      } as any);

      const provider = new ApiKeyProvider();

      // Act
      const config = provider.getServiceConfig('openai');

      // Assert
      expect(config).toEqual({
        apiKey: 'env-openai-key',
        isValid: false, // env key doesn't match sk- pattern
        source: 'environment',
        isDemo: true,
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle settings manager errors gracefully', () => {
      // Arrange
      mockGetSettings.mockImplementation(() => {
        throw new Error('Settings error');
      });

      // Act & Assert - should not throw
      expect(() => new ApiKeyProvider()).not.toThrow();
      
      const provider = new ApiKeyProvider();
      expect(provider.getKey('openai')).toBe('env-openai-key');
    });

    it('should handle invalid service types', () => {
      // Arrange
      mockGetSettings.mockReturnValue({
        apiKeys: { openai: '', unsplash: '' },
      } as any);

      const provider = new ApiKeyProvider();

      // Act & Assert
      expect(() => provider.getKey('invalid' as any)).toThrow('Unknown service type: invalid');
    });
  });
});