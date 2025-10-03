import React from 'react';
import { logger } from '@/lib/logger';
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
  useDebugStore,
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
 */
export const StateManagementIntegration: React.FC = () => {
  const formId = 'api-key-form';

  // Define form configuration
  const apiKeyFormConfig: Record<string, FieldConfig> = {
    provider: {
      label: 'Provider',
      type: 'text',
      required: true,
      defaultValue: 'openai',
      validation: validationRules.string().required('Provider is required')
    },
    name: {
      label: 'API Key Name',
      type: 'text',
      required: true,
      validation: validationRules.string().min(3, 'Name must be at least 3 characters')
    },
    key: {
      label: 'API Key',
      type: 'password',
      required: true,
      validation: validationRules.string().min(20, 'API key must be at least 20 characters')
    }
  };

  // Initialize all hooks
  useUndoRedoRegistration();
  useDebugRegistration();
  useStoreSyncRegistration();
  useAutoTabSync();
  useUndoRedoShortcuts();

  // Get actions from different stores
  const uiActions = useUIActions();
  const formActions = useFormActions();
  const apiKeyActions = useAPIKeyActions();
  const { registerShortcut } = useKeyboardShortcuts();

  // Initialize form when component mounts
  React.useEffect(() => {
    formActions.createForm(formId, apiKeyFormConfig, { autoSave: true });
    formActions.enableAutoSave(formId, 5000);

    return () => {
      formActions.destroyForm(formId);
    };
  }, [formActions]);

  // Register custom keyboard shortcuts
  React.useEffect(() => {
    registerShortcut('ctrl+k', () => {
      logger.info('Opening API key modal via keyboard shortcut');
    });

    registerShortcut('ctrl+n', () => {
      uiActions.addNotification({
        type: 'info',
        title: 'Keyboard Shortcut',
        message: 'You pressed Ctrl+N!',
        duration: 3000
      });
    });
  }, [registerShortcut, uiActions]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          State Management Integration Example
        </h1>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p>This component demonstrates the integrated state management system.</p>
          <p className="mt-2">Features: Form validation, API key management, UI state, undo/redo, cross-tab sync, and debug monitoring.</p>
        </div>
      </div>
    </div>
  );
};

export default StateManagementIntegration;
