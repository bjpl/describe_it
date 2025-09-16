import React from 'react';
import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { createShallowSelector, useCleanupManager } from '../utils/storeUtils';
import { safeParse, safeStringify } from '@/lib/utils/json-safe';

/**
 * API Keys Store - Secure management of API keys with encryption and persistence
 * Features:
 * - Secure storage with encryption hints
 * - Environment variable fallback
 * - Key validation and testing
 * - Expiration tracking
 * - Usage analytics
 */

interface APIKey {
  id: string;
  name: string;
  key: string;
  provider: 'openai' | 'unsplash' | 'custom';
  isActive: boolean;
  createdAt: Date;
  lastUsed?: Date;
  expiresAt?: Date;
  usageCount: number;
  rateLimit?: {
    requests: number;
    windowMs: number;
    remaining: number;
    resetTime: Date;
  };
  metadata?: Record<string, unknown>;
}

interface APIKeyValidation {
  isValid: boolean;
  error?: string;
  capabilities?: string[];
  rateLimit?: APIKey['rateLimit'];
}

interface APIKeysState {
  keys: Record<string, APIKey>;
  activeKeys: Record<string, string>; // provider -> keyId
  isLoading: boolean;
  error: string | null;
  lastValidated: Record<string, Date>;
  
  // Actions
  addKey: (key: Omit<APIKey, 'id' | 'createdAt' | 'usageCount'>) => Promise<string>;
  removeKey: (keyId: string) => Promise<void>;
  updateKey: (keyId: string, updates: Partial<APIKey>) => Promise<void>;
  setActiveKey: (provider: string, keyId: string) => void;
  validateKey: (keyId: string) => Promise<APIKeyValidation>;
  rotateKey: (keyId: string, newKey: string) => Promise<void>;
  
  // Key management
  getActiveKey: (provider: string) => APIKey | null;
  getKeyUsage: (keyId: string) => { count: number; lastUsed?: Date };
  incrementUsage: (keyId: string) => void;
  updateRateLimit: (keyId: string, rateLimit: APIKey['rateLimit']) => void;
  
  // Security
  encryptKey: (key: string) => string;
  decryptKey: (encryptedKey: string) => string;
  clearAllKeys: () => Promise<void>;
  exportKeys: () => string; // Encrypted export
  importKeys: (encryptedData: string) => Promise<void>;
}

// Simple XOR encryption for demo - in production, use proper encryption
const ENCRYPTION_KEY = 'describe-it-key-store-2024';

function simpleEncrypt(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
    );
  }
  return btoa(result);
}

function simpleDecrypt(encrypted: string): string {
  try {
    const decoded = atob(encrypted);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(
        decoded.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
      );
    }
    return result;
  } catch {
    return encrypted; // Return as-is if decryption fails
  }
}

// Validation functions for different providers
const validateOpenAIKey = async (key: string): Promise<APIKeyValidation> => {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      return {
        isValid: true,
        capabilities: ['text-generation', 'vision', 'embeddings'],
        rateLimit: {
          requests: parseInt(response.headers.get('x-ratelimit-limit-requests') || '0'),
          windowMs: 60000,
          remaining: parseInt(response.headers.get('x-ratelimit-remaining-requests') || '0'),
          resetTime: new Date(Date.now() + 60000)
        }
      };
    } else {
      return { isValid: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }
  } catch (error) {
    return { isValid: false, error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
};

const validateUnsplashKey = async (key: string): Promise<APIKeyValidation> => {
  try {
    const response = await fetch(`https://api.unsplash.com/me?client_id=${key}`);
    
    if (response.ok) {
      return {
        isValid: true,
        capabilities: ['image-search', 'image-download'],
        rateLimit: {
          requests: parseInt(response.headers.get('x-ratelimit-limit') || '50'),
          windowMs: 3600000,
          remaining: parseInt(response.headers.get('x-ratelimit-remaining') || '50'),
          resetTime: new Date(Date.now() + 3600000)
        }
      };
    } else {
      return { isValid: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }
  } catch (error) {
    return { isValid: false, error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
};

export const useAPIKeysStore = create<APIKeysState>()(  
  devtools(
    subscribeWithSelector(
      persist(
        (set, get) => ({
          keys: {},
          activeKeys: {},
          isLoading: false,
          error: null,
          lastValidated: {},
          
          addKey: async (keyData) => {
            const keyId = `${keyData.provider}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const encryptedKey = simpleEncrypt(keyData.key);
            
            const newKey: APIKey = {
              ...keyData,
              id: keyId,
              key: encryptedKey,
              createdAt: new Date(),
              usageCount: 0
            };
            
            set((state) => ({
              keys: { ...state.keys, [keyId]: newKey },
              error: null
            }), false, 'addKey');
            
            // Validate the key immediately
            await get().validateKey(keyId);
            
            return keyId;
          },
          
          removeKey: async (keyId) => {
            set((state) => {
              const { [keyId]: removed, ...remainingKeys } = state.keys;
              const newActiveKeys = { ...state.activeKeys };
              
              // Remove from active keys if it was active
              Object.keys(newActiveKeys).forEach(provider => {
                if (newActiveKeys[provider] === keyId) {
                  delete newActiveKeys[provider];
                }
              });
              
              return {
                keys: remainingKeys,
                activeKeys: newActiveKeys,
                error: null
              };
            }, false, 'removeKey');
          },
          
          updateKey: async (keyId, updates) => {
            set((state) => {
              const key = state.keys[keyId];
              if (!key) return state;
              
              const updatedKey = { ...key, ...updates };
              
              // Re-encrypt key if it was updated
              if (updates.key) {
                updatedKey.key = simpleEncrypt(updates.key);
              }
              
              return {
                keys: { ...state.keys, [keyId]: updatedKey },
                error: null
              };
            }, false, 'updateKey');
          },
          
          setActiveKey: (provider, keyId) => {
            set((state) => ({
              activeKeys: { ...state.activeKeys, [provider]: keyId }
            }), false, 'setActiveKey');
          },
          
          validateKey: async (keyId) => {
            const key = get().keys[keyId];
            if (!key) {
              return { isValid: false, error: 'Key not found' };
            }
            
            set({ isLoading: true, error: null }, false, 'validateKey:start');
            
            try {
              const decryptedKey = simpleDecrypt(key.key);
              let validation: APIKeyValidation;
              
              switch (key.provider) {
                case 'openai':
                  validation = await validateOpenAIKey(decryptedKey);
                  break;
                case 'unsplash':
                  validation = await validateUnsplashKey(decryptedKey);
                  break;
                default:
                  validation = { isValid: true }; // Custom keys assumed valid
              }
              
              // Update key status and rate limits
              if (validation.isValid) {
                await get().updateKey(keyId, {
                  isActive: true,
                  lastUsed: new Date(),
                  rateLimit: validation.rateLimit
                });
              } else {
                await get().updateKey(keyId, { isActive: false });
              }
              
              set((state) => ({
                lastValidated: { ...state.lastValidated, [keyId]: new Date() },
                isLoading: false,
                error: validation.isValid ? null : validation.error || 'Validation failed'
              }), false, 'validateKey:complete');
              
              return validation;
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              set({ isLoading: false, error: errorMessage }, false, 'validateKey:error');
              return { isValid: false, error: errorMessage };
            }
          },
          
          rotateKey: async (keyId, newKey) => {
            await get().updateKey(keyId, { 
              key: newKey,
              createdAt: new Date(),
              usageCount: 0,
              lastUsed: undefined
            });
            await get().validateKey(keyId);
          },
          
          getActiveKey: (provider) => {
            const activeKeyId = get().activeKeys[provider];
            if (!activeKeyId) return null;
            
            const key = get().keys[activeKeyId];
            if (!key || !key.isActive) return null;
            
            return {
              ...key,
              key: simpleDecrypt(key.key) // Decrypt for use
            };
          },
          
          getKeyUsage: (keyId) => {
            const key = get().keys[keyId];
            return {
              count: key?.usageCount || 0,
              lastUsed: key?.lastUsed
            };
          },
          
          incrementUsage: (keyId) => {
            set((state) => {
              const key = state.keys[keyId];
              if (!key) return state;
              
              return {
                keys: {
                  ...state.keys,
                  [keyId]: {
                    ...key,
                    usageCount: key.usageCount + 1,
                    lastUsed: new Date()
                  }
                }
              };
            }, false, 'incrementUsage');
          },
          
          updateRateLimit: (keyId, rateLimit) => {
            set((state) => {
              const key = state.keys[keyId];
              if (!key) return state;
              
              return {
                keys: {
                  ...state.keys,
                  [keyId]: { ...key, rateLimit }
                }
              };
            }, false, 'updateRateLimit');
          },
          
          encryptKey: simpleEncrypt,
          decryptKey: simpleDecrypt,
          
          clearAllKeys: async () => {
            set({
              keys: {},
              activeKeys: {},
              lastValidated: {},
              error: null
            }, false, 'clearAllKeys');
          },
          
          exportKeys: () => {
            const state = get();
            const data = safeStringify({
              keys: state.keys,
              activeKeys: state.activeKeys,
              exportedAt: new Date().toISOString()
            });
            return data ? btoa(data) : '';
          },
          
          importKeys: async (encryptedData) => {
            try {
              const decoded = atob(encryptedData);
              const data = safeParse(decoded, null);
              if (data) {
                set({
                  keys: data.keys || {},
                  activeKeys: data.activeKeys || {},
                  error: null
                }, false, 'importKeys');
              } else {
                throw new Error('Invalid key data format');
              }
            } catch (error) {
              set({ 
                error: `Import failed: ${error instanceof Error ? error.message : 'Invalid data'}` 
              }, false, 'importKeys:error');
            }
          }
        }),
        {
          name: 'describe-it-api-keys',
          partialize: (state) => ({
            keys: state.keys,
            activeKeys: state.activeKeys
          }),
          // Only persist in browser environment
          storage: typeof window !== 'undefined' ? undefined : {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {}
          }
        }
      )
    ),
    { name: 'APIKeysStore' }
  )
);

// Optimized selectors
const apiKeysSelector = createShallowSelector((state: APIKeysState) => ({
  keys: Object.values(state.keys).map(key => ({
    ...key,
    key: '***' + key.key.slice(-4) // Masked for display
  })),
  activeKeys: state.activeKeys,
  isLoading: state.isLoading,
  error: state.error
}));

const activeKeysSelector = createShallowSelector((state: APIKeysState) => ({
  openai: state.getActiveKey('openai'),
  unsplash: state.getActiveKey('unsplash'),
  custom: state.getActiveKey('custom')
}));

// Hooks
export const useAPIKeys = () => apiKeysSelector(useAPIKeysStore);
export const useActiveAPIKeys = () => activeKeysSelector(useAPIKeysStore);
export const useAPIKeyActions = () => useAPIKeysStore((state) => ({
  addKey: state.addKey,
  removeKey: state.removeKey,
  updateKey: state.updateKey,
  setActiveKey: state.setActiveKey,
  validateKey: state.validateKey,
  rotateKey: state.rotateKey,
  clearAllKeys: state.clearAllKeys,
  exportKeys: state.exportKeys,
  importKeys: state.importKeys
}));

// Key usage tracking hook
export const useAPIKeyUsage = (keyId: string) => {
  return useAPIKeysStore((state) => state.getKeyUsage(keyId));
};

// Auto-validation hook
export const useAPIKeyValidation = () => {
  const cleanupManager = useCleanupManager();
  const validateKey = useAPIKeysStore((state) => state.validateKey);
  const keys = useAPIKeysStore((state) => Object.keys(state.keys));
  
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Validate all keys periodically
    const validateAllKeys = async () => {
      for (const keyId of keys) {
        try {
          await validateKey(keyId);
        } catch (error) {
          console.warn(`Failed to validate key ${keyId}:`, error);
        }
      }
    };
    
    // Initial validation
    validateAllKeys();
    
    // Set up periodic validation (every hour)
    const intervalId = cleanupManager.addInterval(validateAllKeys, 3600000);
    
    return () => cleanupManager.clearInterval(intervalId);
  }, [keys, validateKey, cleanupManager]);
};