import React from 'react';
import {
  useUIActions,
  useFormActions,
  useAPIKeyActions,
  useUndoRedoRegistration,
  useDebugRegistration,
  useStoreSyncRegistration,
  useAutoTabSync,
  useUndoRedoShortcuts,
  useKeyboardShortcuts,
  validationRules,
  useAppStore,
  useUIStore,
  useFormStore,
  useAPIKeysStore,
  type FieldConfig
} from '@/lib/store';

/**
 * Comprehensive State Management Integration Example
 * 
 * This example demonstrates how to integrate all the state management features:
 * - Form management with validation
 * - API key management with encryption
 * - UI state management (modals, notifications, themes)
 * - Undo/redo functionality
 * - Cross-tab synchronization
 * - Debug monitoring
 * - SSR-safe persistence
 */

// Form configuration for API key setup
const apiKeyFormConfig: Record<string, FieldConfig> = {
  provider: {
    name: 'provider',
    defaultValue: 'openai',
    required: true,
    validationRules: [
      validationRules.required(),
      {
        validate: (value: string) => ['openai', 'unsplash', 'custom'].includes(value),
        message: 'Please select a valid provider'
      }
    ]
  },
  name: {
    name: 'name',
    defaultValue: '',
    required: true,
    validationRules: [
      validationRules.required(),
      validationRules.minLength(3),
      validationRules.maxLength(50)
    ]
  },
  key: {
    name: 'key',
    defaultValue: '',
    required: true,
    validationRules: [
      validationRules.required(),
      validationRules.minLength(20),
      // Dynamic validation based on provider
      {
        validate: async (value: string) => {
          const provider = useFormStore.getState().forms['api-key-form']?.fields.provider?.value;
          if (provider === 'openai') {
            return /^sk-[A-Za-z0-9]{48}$/.test(value);
          } else if (provider === 'unsplash') {
            return /^[A-Za-z0-9_-]{43}$/.test(value);
          }
          return true; // Custom keys
        },
        message: 'Invalid API key format for selected provider'
      }
    ],
    sanitizer: (value: string) => value.trim()
  }
};

export const StateManagementIntegration: React.FC = () => {
  const formId = 'api-key-form';
  
  // Initialize all the integrations
  useAutoTabSync({ 
    enabled: true,
    conflictStrategy: 'last-write-wins',
    excludedStores: new Set(['ui-store']) // Don't sync UI state
  });
  
  // Register stores for undo/redo (with different strategies)
  useUndoRedoRegistration('app-store', useAppStore, 'selective', ['currentImage', 'searchHistory']);
  useUndoRedoRegistration('form-store', useFormStore, 'full');
  useUndoRedoRegistration('api-keys-store', useAPIKeysStore, 'full');
  
  // Register stores for debugging (in development only)
  useDebugRegistration('app-store', useAppStore, { name: 'Application Store', autoMonitor: true });
  useDebugRegistration('ui-store', useUIStore, { name: 'UI Store', autoMonitor: false });
  useDebugRegistration('form-store', useFormStore, { name: 'Form Store' });
  useDebugRegistration('api-keys-store', useAPIKeysStore, { name: 'API Keys Store' });
  
  // Register stores for cross-tab sync
  useStoreSyncRegistration('app-store', useAppStore);
  useStoreSyncRegistration('api-keys-store', useAPIKeysStore);
  
  // Enable keyboard shortcuts
  useUndoRedoShortcuts(); // Global undo/redo
  
  // Get actions from different stores
  const uiActions = useUIActions();
  const formActions = useFormActions();
  const apiKeyActions = useAPIKeyActions();
  const { registerShortcut } = useKeyboardShortcuts();\n  \n  // Initialize form when component mounts\n  React.useEffect(() => {\n    formActions.createForm(formId, apiKeyFormConfig, { autoSave: true });\n    formActions.enableAutoSave(formId, 5000); // Auto-save every 5 seconds\n    \n    // Cleanup form when component unmounts\n    return () => {\n      formActions.destroyForm(formId);\n    };\n  }, [formActions]);\n  \n  // Register custom keyboard shortcuts\n  React.useEffect(() => {\n    // Open API key modal with Ctrl+K\n    registerShortcut('ctrl+k', () => {\n      handleOpenApiKeyModal();\n    });\n    \n    // Show notifications with Ctrl+N\n    registerShortcut('ctrl+n', () => {\n      uiActions.addNotification({\n        type: 'info',\n        title: 'Keyboard Shortcut',\n        message: 'You pressed Ctrl+N!',\n        duration: 3000\n      });\n    });\n  }, [registerShortcut, uiActions]);\n  \n  // Handle API key form submission\n  const handleApiKeySubmit = async () => {\n    try {\n      const isValid = await formActions.validateForm(formId);\n      if (!isValid) {\n        uiActions.addNotification({\n          type: 'error',\n          title: 'Validation Error',\n          message: 'Please fix the form errors before submitting.',\n          duration: 5000\n        });\n        return;\n      }\n      \n      await formActions.submitForm(formId, async (formData) => {\n        // Add API key\n        const keyId = await apiKeyActions.addKey({\n          name: formData.name,\n          key: formData.key,\n          provider: formData.provider,\n          isActive: true\n        });\n        \n        // Set as active key\n        apiKeyActions.setActiveKey(formData.provider, keyId);\n        \n        // Show success notification\n        uiActions.addNotification({\n          type: 'success',\n          title: 'API Key Added',\n          message: `${formData.name} has been added and activated.`,\n          duration: 4000\n        });\n        \n        // Close modal\n        uiActions.closeTopModal();\n        \n        // Reset form\n        formActions.resetForm(formId);\n        \n        return { success: true };\n      });\n      \n    } catch (error) {\n      uiActions.addNotification({\n        type: 'error',\n        title: 'Submission Failed',\n        message: error instanceof Error ? error.message : 'Unknown error occurred',\n        duration: 5000\n      });\n    }\n  };\n  \n  const handleOpenApiKeyModal = () => {\n    uiActions.openModal({\n      component: 'ApiKeyModal',\n      props: { formId },\n      size: 'md',\n      backdrop: true,\n      priority: 1\n    });\n  };\n  \n  const handleToggleTheme = () => {\n    const currentTheme = useUIStore.getState().theme;\n    const newTheme = currentTheme === 'light' ? 'dark' : 'light';\n    uiActions.setTheme(newTheme);\n    \n    uiActions.addNotification({\n      type: 'info',\n      title: 'Theme Changed',\n      message: `Switched to ${newTheme} theme`,\n      duration: 2000\n    });\n  };\n  \n  const handleShowDebugInfo = () => {\n    const debugData = {\n      appState: useAppStore.getState(),\n      uiState: useUIStore.getState(),\n      formStates: useFormStore.getState().forms,\n      apiKeys: useAPIKeysStore.getState().keys\n    };\n    \n    console.log('Current State:', debugData);\n    \n    uiActions.addNotification({\n      type: 'info',\n      title: 'Debug Info',\n      message: 'Current state logged to console',\n      duration: 3000\n    });\n  };\n  \n  const handleExportState = () => {\n    try {\n      // Export from debug store if available\n      const debugStore = useDebugStore.getState();\n      const exportData = debugStore.exportDebugData({ \n        includeStates: true,\n        timeRange: [new Date(Date.now() - 24 * 60 * 60 * 1000), new Date()] // Last 24 hours\n      });\n      \n      // Create download\n      const blob = new Blob([exportData], { type: 'application/json' });\n      const url = URL.createObjectURL(blob);\n      const link = document.createElement('a');\n      link.href = url;\n      link.download = `state-export-${new Date().toISOString()}.json`;\n      link.click();\n      URL.revokeObjectURL(url);\n      \n      uiActions.addNotification({\n        type: 'success',\n        title: 'State Exported',\n        message: 'Application state has been exported successfully',\n        duration: 3000\n      });\n    } catch (error) {\n      uiActions.addNotification({\n        type: 'error',\n        title: 'Export Failed',\n        message: 'Failed to export application state',\n        duration: 5000\n      });\n    }\n  };\n  \n  const handleTestFormValidation = async () => {\n    // Test form with invalid data\n    formActions.setFieldValue(formId, 'provider', 'openai');\n    formActions.setFieldValue(formId, 'name', 'Te'); // Too short\n    formActions.setFieldValue(formId, 'key', 'invalid-key'); // Wrong format\n    \n    // Validate all fields\n    const isValid = await formActions.validateForm(formId);\n    \n    uiActions.addNotification({\n      type: isValid ? 'success' : 'warning',\n      title: 'Validation Test',\n      message: isValid ? 'Form is valid' : 'Form has validation errors (as expected)',\n      duration: 3000\n    });\n  };\n  \n  const handleStartFormGroup = () => {\n    formActions.startGroup('Bulk form updates');\n    \n    // Make multiple form changes that will be grouped together for undo/redo\n    formActions.setFieldValue(formId, 'provider', 'unsplash');\n    formActions.setFieldValue(formId, 'name', 'My Unsplash Key');\n    formActions.setFieldValue(formId, 'key', 'sample-key-that-meets-length-requirements-12345');\n    \n    setTimeout(() => {\n      formActions.endGroup();\n      \n      uiActions.addNotification({\n        type: 'info',\n        title: 'Form Group',\n        message: 'Multiple form changes grouped together. Try undo/redo!',\n        duration: 4000\n      });\n    }, 100);\n  };\n  \n  return (\n    <div className=\"max-w-4xl mx-auto p-6 space-y-6\">\n      <div className=\"bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6\">\n        <h1 className=\"text-2xl font-bold text-gray-900 dark:text-white mb-6\">\n          State Management Integration Example\n        </h1>\n        \n        <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4\">\n          {/* UI State Actions */}\n          <div className=\"space-y-3\">\n            <h2 className=\"text-lg font-semibold text-gray-700 dark:text-gray-300\">\n              UI State\n            </h2>\n            \n            <button\n              onClick={handleOpenApiKeyModal}\n              className=\"w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors\"\n            >\n              Open API Key Modal\n            </button>\n            \n            <button\n              onClick={handleToggleTheme}\n              className=\"w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors\"\n            >\n              Toggle Theme\n            </button>\n            \n            <button\n              onClick={() => {\n                uiActions.addNotification({\n                  type: 'success',\n                  title: 'Test Notification',\n                  message: 'This is a test notification with action',\n                  duration: 5000,\n                  action: {\n                    label: 'Dismiss',\n                    handler: () => console.log('Notification action clicked')\n                  }\n                });\n              }}\n              className=\"w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors\"\n            >\n              Show Notification\n            </button>\n          </div>\n          \n          {/* Form State Actions */}\n          <div className=\"space-y-3\">\n            <h2 className=\"text-lg font-semibold text-gray-700 dark:text-gray-300\">\n              Form State\n            </h2>\n            \n            <button\n              onClick={handleTestFormValidation}\n              className=\"w-full px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors\"\n            >\n              Test Form Validation\n            </button>\n            \n            <button\n              onClick={handleStartFormGroup}\n              className=\"w-full px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors\"\n            >\n              Fill Form (Grouped)\n            </button>\n            \n            <button\n              onClick={() => formActions.resetForm(formId)}\n              className=\"w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors\"\n            >\n              Reset Form\n            </button>\n          </div>\n          \n          {/* Debug & Development */}\n          <div className=\"space-y-3\">\n            <h2 className=\"text-lg font-semibold text-gray-700 dark:text-gray-300\">\n              Debug Tools\n            </h2>\n            \n            <button\n              onClick={handleShowDebugInfo}\n              className=\"w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors\"\n            >\n              Log State to Console\n            </button>\n            \n            <button\n              onClick={handleExportState}\n              className=\"w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors\"\n            >\n              Export Debug Data\n            </button>\n            \n            <div className=\"text-sm text-gray-600 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-700 rounded\">\n              <p><strong>Keyboard Shortcuts:</strong></p>\n              <ul className=\"mt-1 space-y-1\">\n                <li>Ctrl+K: Open API Key Modal</li>\n                <li>Ctrl+Z: Undo</li>\n                <li>Ctrl+Y: Redo</li>\n                <li>Ctrl+N: Show Notification</li>\n              </ul>\n            </div>\n          </div>\n        </div>\n        \n        {/* Feature Status */}\n        <div className=\"mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg\">\n          <h3 className=\"text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3\">\n            Active Features\n          </h3>\n          \n          <div className=\"grid grid-cols-2 md:grid-cols-4 gap-4 text-sm\">\n            <div className=\"text-green-600 dark:text-green-400\">\n              ✅ SSR-Safe Persistence\n            </div>\n            <div className=\"text-green-600 dark:text-green-400\">\n              ✅ Cross-Tab Sync\n            </div>\n            <div className=\"text-green-600 dark:text-green-400\">\n              ✅ Undo/Redo System\n            </div>\n            <div className=\"text-green-600 dark:text-green-400\">\n              ✅ Form Validation\n            </div>\n            <div className=\"text-green-600 dark:text-green-400\">\n              ✅ API Key Security\n            </div>\n            <div className=\"text-green-600 dark:text-green-400\">\n              ✅ Debug Monitoring\n            </div>\n            <div className=\"text-green-600 dark:text-green-400\">\n              ✅ Performance Tracking\n            </div>\n            <div className=\"text-green-600 dark:text-green-400\">\n              ✅ Theme Management\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  );\n};\n\nexport default StateManagementIntegration;