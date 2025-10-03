import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ApiKeyProvider } from '@/lib/api/keyProvider';
import { settingsManager } from '@/lib/settings/settingsManager';

// Mock dependencies
vi.mock('@/lib/settings/settingsManager', () => ({
  settingsManager: {
    getSettings: vi.fn(),
    addListener: vi.fn(),
  },
}));

describe('API Services Integration with KeyProvider', () => {
  let mockGetSettings: ReturnType<typeof vi.fn>;
  let mockAddListener: ReturnType<typeof vi.fn>;
  let provider: ApiKeyProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockGetSettings = vi.mocked(settingsManager.getSettings);
    mockAddListener = vi.mocked(settingsManager.addListener);
    mockAddListener.mockReturnValue(() => {});
    
    // Mock environment with valid keys
    vi.stubGlobal('process', {
      env: {
        OPENAI_API_KEY: 'sk-env1234567890abcdef1234567890abcdef123456789',
        NEXT_PUBLIC_UNSPLASH_ACCESS_KEY: 'env1234567890abcdef1234567890abcdef123456789',
      }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (provider) {
      provider = null as any;
    }
  });

  describe('Service Integration Pattern', () => {
    it('should allow services to integrate with dynamic key updates', () => {
      // Arrange - Start with settings that have keys
      mockGetSettings.mockReturnValue({
        apiKeys: {
          openai: 'sk-settings1234567890abcdef1234567890abcdef',
          unsplash: 'settings1234567890abcdef1234567890abcdef12',
        },
      } as any);

      provider = new ApiKeyProvider();

      // Act - Service would use this configuration
      const openaiConfig = provider.getServiceConfig('openai');
      const unsplashConfig = provider.getServiceConfig('unsplash');

      // Assert
      expect(openaiConfig.apiKey).toBe('sk-settings1234567890abcdef1234567890abcdef');
      expect(openaiConfig.source).toBe('settings');
      expect(openaiConfig.isValid).toBe(true);
      expect(openaiConfig.isDemo).toBe(false);

      expect(unsplashConfig.apiKey).toBe('settings1234567890abcdef1234567890abcdef12');
      expect(unsplashConfig.source).toBe('settings');
      expect(unsplashConfig.isValid).toBe(true);
      expect(unsplashConfig.isDemo).toBe(false);
    });

    it('should notify services when keys change through settings', () => {
      // Arrange
      mockGetSettings.mockReturnValue({
        apiKeys: { openai: '', unsplash: '' },
      } as any);

      provider = new ApiKeyProvider();
      const serviceUpdateHandler = vi.fn();
      provider.addListener(serviceUpdateHandler);

      // Simulate settings change via the listener that was registered
      const settingsListener = mockAddListener.mock.calls[0]?.[0];
      expect(settingsListener).toBeDefined();

      // Act - Simulate settings update
      settingsListener({
        apiKeys: {
          openai: 'sk-new1234567890abcdef1234567890abcdef123456',
          unsplash: 'new1234567890abcdef1234567890abcdef123456',
        },
      } as any);

      // Assert
      expect(serviceUpdateHandler).toHaveBeenCalledWith({
        openai: 'sk-new1234567890abcdef1234567890abcdef123456',
        unsplash: 'new1234567890abcdef1234567890abcdef123456',
      });
    });

    it('should support environment fallback pattern', () => {
      // Arrange - Empty settings should fallback to environment
      mockGetSettings.mockReturnValue({
        apiKeys: { openai: '', unsplash: '' },
      } as any);

      provider = new ApiKeyProvider();

      // Act
      const openaiConfig = provider.getServiceConfig('openai');
      const unsplashConfig = provider.getServiceConfig('unsplash');

      // Assert - Should use environment values
      expect(openaiConfig.apiKey).toBe('sk-env1234567890abcdef1234567890abcdef123456789');
      expect(openaiConfig.source).toBe('environment');
      expect(openaiConfig.isValid).toBe(true); // This key should be valid

      expect(unsplashConfig.apiKey).toBe('env1234567890abcdef1234567890abcdef123456789');
      expect(unsplashConfig.source).toBe('environment');
      expect(unsplashConfig.isValid).toBe(true);
    });

    it('should handle demo mode for invalid keys', () => {
      // Arrange - Invalid keys
      mockGetSettings.mockReturnValue({
        apiKeys: {
          openai: 'invalid-openai-key',
          unsplash: 'short',
        },
      } as any);

      vi.stubGlobal('process', { env: {} }); // No environment fallback

      provider = new ApiKeyProvider();

      // Act
      const openaiConfig = provider.getServiceConfig('openai');
      const unsplashConfig = provider.getServiceConfig('unsplash');

      // Assert
      expect(openaiConfig.isValid).toBe(false);
      expect(openaiConfig.isDemo).toBe(true);
      expect(unsplashConfig.isValid).toBe(false);
      expect(unsplashConfig.isDemo).toBe(true);
    });

    it('should provide consistent validation across all methods', () => {
      // Arrange
      mockGetSettings.mockReturnValue({
        apiKeys: {
          openai: 'sk-valid1234567890abcdef1234567890abcdef123',
          unsplash: 'valid1234567890abcdef1234567890abcdef1234',
        },
      } as any);

      provider = new ApiKeyProvider();

      // Act & Assert - Multiple ways to check validity should be consistent
      expect(provider.validateKey('openai', 'sk-valid1234567890abcdef1234567890abcdef123')).toBe(true);
      expect(provider.isInDemoMode('openai')).toBe(false);
      expect(provider.getServiceConfig('openai').isValid).toBe(true);

      expect(provider.validateKey('unsplash', 'valid1234567890abcdef1234567890abcdef1234')).toBe(true);
      expect(provider.isInDemoMode('unsplash')).toBe(false);
      expect(provider.getServiceConfig('unsplash').isValid).toBe(true);
    });

    it('should handle settings errors gracefully', () => {
      // Arrange
      mockGetSettings.mockImplementation(() => {
        throw new Error('Settings unavailable');
      });

      // Act & Assert - Should not throw and should fallback to environment
      expect(() => {
        provider = new ApiKeyProvider();
      }).not.toThrow();

      expect(provider.getKey('openai')).toBe('sk-env1234567890abcdef1234567890abcdef123456789');
      expect(provider.getKey('unsplash')).toBe('env1234567890abcdef1234567890abcdef123456789');
    });

    it('should track key changes and avoid unnecessary updates', () => {
      // Arrange
      mockGetSettings.mockReturnValue({
        apiKeys: {
          openai: 'sk-same1234567890abcdef1234567890abcdef1234',
          unsplash: 'same1234567890abcdef1234567890abcdef12345',
        },
      } as any);

      provider = new ApiKeyProvider();
      const updateListener = vi.fn();
      provider.addListener(updateListener);

      const settingsListener = mockAddListener.mock.calls[0]?.[0];

      // Act - Trigger with same keys
      settingsListener({
        apiKeys: {
          openai: 'sk-same1234567890abcdef1234567890abcdef1234',
          unsplash: 'same1234567890abcdef1234567890abcdef12345',
        },
      } as any);

      // Assert - Should not trigger update since keys are the same
      expect(updateListener).not.toHaveBeenCalled();
    });

    it('should handle service listener cleanup', () => {
      // Arrange
      mockGetSettings.mockReturnValue({
        apiKeys: { openai: '', unsplash: '' },
      } as any);

      provider = new ApiKeyProvider();
      const listener = vi.fn();
      
      // Act
      const unsubscribe = provider.addListener(listener);
      unsubscribe();

      // Trigger settings change
      const settingsListener = mockAddListener.mock.calls[0]?.[0];
      settingsListener({
        apiKeys: {
          openai: 'sk-new1234567890abcdef1234567890abcdef123456',
          unsplash: 'new1234567890abcdef1234567890abcdef123456',
        },
      } as any);

      // Assert - Listener should not be called after unsubscribe
      expect(listener).not.toHaveBeenCalled();
    });
  });
});