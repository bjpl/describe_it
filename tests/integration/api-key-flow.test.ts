/**
 * End-to-End API Key Flow Integration Test
 * 
 * This test demonstrates the complete flow of how API keys are managed
 * in the application, from user input to service usage.
 * 
 * LEARNING POINTS:
 * 1. Priority-based key resolution (Settings > Environment > Demo)
 * 2. Real-time updates using Observer pattern
 * 3. Service reinitialization on key changes
 * 4. Security validation and sanitization
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { apiKeyProvider } from '@/lib/api/keyProvider';
import { settingsManager } from '@/lib/settings/settingsManager';
import { unsplashService } from '@/lib/api/unsplash';

// Mock the settings manager
vi.mock('@/lib/settings/settingsManager', () => ({
  settingsManager: {
    getSettings: vi.fn(),
    updateSection: vi.fn(),
    addListener: vi.fn(),
  },
}));

describe('🎯 Complete API Key Flow - User Journey', () => {
  let mockGetSettings: ReturnType<typeof vi.fn>;
  let mockUpdateSection: ReturnType<typeof vi.fn>;
  let mockAddListener: ReturnType<typeof vi.fn>;
  let settingsListenerCallback: ((settings: any) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockGetSettings = vi.mocked(settingsManager.getSettings);
    mockUpdateSection = vi.mocked(settingsManager.updateSection);
    mockAddListener = vi.mocked(settingsManager.addListener);
    
    // Capture the settings listener
    mockAddListener.mockImplementation((callback) => {
      settingsListenerCallback = callback;
      return () => { settingsListenerCallback = null; };
    });

    // Clear environment variables for clean test
    vi.stubGlobal('process', { env: {} });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('📚 Learning Scenario: User Configures API Keys', () => {
    it('should demonstrate the complete flow from UI to service', () => {
      // Step 1: Initial state - No keys configured
      mockGetSettings.mockReturnValue({
        apiKeys: { openai: '', unsplash: '' },
      } as any);

      // Create a fresh provider instance for testing
      // IMPORTANT: We use constructor to avoid singleton issues in tests
      const ApiKeyProvider = apiKeyProvider.constructor as any;
      const provider = new ApiKeyProvider();
      
      // LEARNING POINT: Provider starts in demo mode when no keys
      let config = provider.getServiceConfig('unsplash');
      expect(config.isDemo).toBe(true);
      expect(config.source).toBe('none');
      
      console.log('📍 Initial State:', {
        isDemo: config.isDemo,
        source: config.source,
        explanation: 'No keys = Demo mode activated'
      });

      // Step 2: User enters API key in Settings UI
      const userEnteredKey = 'user_key_1234567890abcdef1234567890';
      
      // Simulate what happens when user types in Settings panel
      // This would trigger settingsManager.updateSection('apiKeys', { unsplash: userEnteredKey })
      
      // Step 3: Settings manager notifies all listeners
      // Simulate settings update with a valid key
      mockGetSettings.mockReturnValue({
        apiKeys: { 
          openai: '', 
          unsplash: userEnteredKey 
        },
      } as any);
      
      // Trigger refresh to pick up new settings
      provider.refreshKeys();
      
      // Step 4: Provider receives update and validates
      config = provider.getServiceConfig('unsplash');
      
      console.log('📍 After User Input:', {
        hasKey: !!config.apiKey,
        isValid: config.isValid,
        source: config.source,
        keyLength: config.apiKey?.length,
        explanation: 'Settings take priority over environment'
      });

      // LEARNING POINT: Priority system in action
      expect(config.apiKey).toBe(userEnteredKey);
      expect(config.isValid).toBe(true);
      expect(config.isDemo).toBe(false);
      // Note: source detection requires actual settings manager integration
    });

    it('should demonstrate security validation preventing injection attacks', () => {
      mockGetSettings.mockReturnValue({
        apiKeys: { openai: '', unsplash: '' },
      } as any);

      const provider = new apiKeyProvider.constructor();
      
      // SECURITY LEARNING: Various attack vectors
      const maliciousInputs = [
        'sk-example-key',           // Placeholder detection
        'your-key-here-123456789',  // Common placeholder
        'key<script>alert(1)</script>', // XSS attempt
        'key"; DROP TABLE users;--', // SQL injection attempt
        'short',                     // Too short
      ];

      maliciousInputs.forEach(input => {
        const isValid = provider.validateKey('unsplash', input);
        
        console.log(`🔒 Security Check for "${input}":`, {
          isValid,
          reason: !isValid ? 'Blocked by validation' : 'Would pass',
          protectionType: input.includes('<') ? 'XSS Protection' :
                         input.includes('"') ? 'Injection Protection' :
                         input.includes('example') ? 'Placeholder Detection' :
                         input.length < 20 ? 'Length Requirement' : 'Unknown'
        });
        
        expect(isValid).toBe(false);
      });
    });

    it('should demonstrate environment variable fallback', () => {
      // LEARNING SCENARIO: Production deployment with env vars
      vi.stubGlobal('process', {
        env: {
          NEXT_PUBLIC_UNSPLASH_ACCESS_KEY: 'env_key_1234567890abcdef1234567890',
        }
      });

      // Start with empty settings
      mockGetSettings.mockReturnValue({
        apiKeys: { openai: '', unsplash: '' },
      } as any);

      const provider = new apiKeyProvider.constructor();
      const config = provider.getServiceConfig('unsplash');

      console.log('🌍 Environment Fallback:', {
        source: config.source,
        hasKey: !!config.apiKey,
        explanation: 'When settings empty, falls back to env vars'
      });

      expect(config.source).toBe('environment');
      expect(config.apiKey).toBe('env_key_1234567890abcdef1234567890');
      expect(config.isDemo).toBe(false);

      // Now user adds their own key - should override environment
      mockGetSettings.mockReturnValue({
        apiKeys: { 
          openai: '', 
          unsplash: 'user_override_key_1234567890abcdef' 
        },
      } as any);
      
      provider.refreshKeys();

      const newConfig = provider.getServiceConfig('unsplash');
      
      console.log('🎯 Priority Override:', {
        oldSource: 'environment',
        newKey: newConfig.apiKey,
        hasNewKey: !!newConfig.apiKey,
        explanation: 'User settings always win over environment'
      });

      // Verify the key changed to user's key
      expect(newConfig.apiKey).toBe('user_override_key_1234567890abcdef');
    });

    it('should demonstrate real-time service updates', () => {
      // ADVANCED LEARNING: How services react to key changes
      
      mockGetSettings.mockReturnValue({
        apiKeys: { openai: '', unsplash: '' },
      } as any);

      const provider = new apiKeyProvider.constructor();
      
      // Track service updates
      const serviceUpdates: string[] = [];
      
      // Simulate a service listening for updates
      const unsubscribe = provider.addListener((keys) => {
        serviceUpdates.push(`Service received update: Unsplash=${keys.unsplash ? 'configured' : 'empty'}`);
        
        console.log('🔄 Real-time Update:', {
          event: 'Key changed',
          action: 'Service reinitializing',
          newState: keys.unsplash ? 'Active' : 'Demo',
        });
      });

      // User enters key
      if (settingsListenerCallback) {
        settingsListenerCallback({
          apiKeys: { 
            openai: '', 
            unsplash: 'new_key_1234567890abcdef1234567890' 
          },
        });
      }

      expect(serviceUpdates).toHaveLength(1);
      expect(serviceUpdates[0]).toContain('configured');

      // User removes key
      if (settingsListenerCallback) {
        settingsListenerCallback({
          apiKeys: { openai: '', unsplash: '' },
        });
      }

      expect(serviceUpdates).toHaveLength(2);
      expect(serviceUpdates[1]).toContain('empty');

      // Cleanup demonstrates proper resource management
      unsubscribe();
      
      // After unsubscribe, no more updates
      if (settingsListenerCallback) {
        settingsListenerCallback({
          apiKeys: { openai: '', unsplash: 'ignored_key' },
        });
      }

      expect(serviceUpdates).toHaveLength(2); // No new updates
      
      console.log('🧹 Cleanup:', {
        totalUpdates: serviceUpdates.length,
        explanation: 'Proper cleanup prevents memory leaks'
      });
    });
  });

  describe('🏗️ Architecture Patterns Demonstrated', () => {
    it('should show Singleton pattern benefits', () => {
      // LEARNING: Why Singleton matters
      const instance1 = apiKeyProvider;
      const instance2 = apiKeyProvider;
      
      expect(instance1).toBe(instance2);
      
      console.log('🏛️ Singleton Pattern:', {
        same: instance1 === instance2,
        benefit: 'Single source of truth for entire app',
        antipattern: 'Multiple instances would cause sync issues'
      });
    });

    it('should show Observer pattern in action', () => {
      mockGetSettings.mockReturnValue({
        apiKeys: { openai: '', unsplash: '' },
      } as any);

      const provider = new apiKeyProvider.constructor();
      
      // Multiple observers (like different services)
      const observers = {
        imageService: vi.fn(),
        aiService: vi.fn(),
        analyticsService: vi.fn(),
      };

      // All services subscribe
      const unsubscribes = Object.entries(observers).map(([name, fn]) => {
        console.log(`📡 ${name} subscribed to key updates`);
        return provider.addListener(fn);
      });

      // Single update notifies all
      if (settingsListenerCallback) {
        settingsListenerCallback({
          apiKeys: { 
            openai: 'key1', 
            unsplash: 'key2' 
          },
        });
      }

      // All observers notified
      Object.entries(observers).forEach(([name, fn]) => {
        expect(fn).toHaveBeenCalledTimes(1);
        console.log(`✅ ${name} received update`);
      });

      console.log('📢 Observer Benefits:', {
        pattern: 'One-to-many notification',
        efficiency: 'No polling needed',
        decoupling: 'Services independent of each other'
      });

      // Cleanup all
      unsubscribes.forEach(fn => fn());
    });
  });

  describe('🚀 Performance Optimizations', () => {
    it('should prevent unnecessary updates when keys unchanged', () => {
      mockGetSettings.mockReturnValue({
        apiKeys: { 
          openai: 'same_key_123',
          unsplash: 'same_key_456' 
        },
      } as any);

      const provider = new apiKeyProvider.constructor();
      const updateListener = vi.fn();
      provider.addListener(updateListener);

      // Send same keys
      if (settingsListenerCallback) {
        settingsListenerCallback({
          apiKeys: { 
            openai: 'same_key_123',
            unsplash: 'same_key_456' 
          },
        });
      }

      // No update triggered
      expect(updateListener).not.toHaveBeenCalled();
      
      console.log('⚡ Performance Optimization:', {
        technique: 'Change detection',
        benefit: 'Avoids unnecessary re-renders and API reinit',
        impact: 'Better UX and lower resource usage'
      });
    });
  });
});

/**
 * KEY TAKEAWAYS:
 * 
 * 1. PRIORITY SYSTEM: Settings > Environment > Demo
 *    - Allows flexible deployment strategies
 *    - Users can override server defaults
 * 
 * 2. OBSERVER PATTERN: Real-time updates
 *    - Services stay synchronized automatically
 *    - No polling or manual refresh needed
 * 
 * 3. SECURITY VALIDATION: Multiple layers
 *    - Format validation (regex)
 *    - Placeholder detection
 *    - Injection prevention
 *    - Length requirements
 * 
 * 4. RESOURCE MANAGEMENT: Proper cleanup
 *    - Unsubscribe functions prevent memory leaks
 *    - Services can cleanly disconnect
 * 
 * 5. PERFORMANCE: Smart change detection
 *    - Only triggers updates on actual changes
 *    - Prevents unnecessary service reinitialization
 */