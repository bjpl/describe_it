/**
 * Error Handling System - Usage Example
 *
 * This file demonstrates how to use the unified error handling system
 * in the describe_it project.
 */

'use client';

import React, { useState } from 'react';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { AppError, ErrorCode, createError } from '@/lib/errors';

export default function ErrorHandlingExample() {
  const { handleError, showSuccess, showError, showWarning, showInfo } = useErrorHandler();
  const [loading, setLoading] = useState(false);

  // Example 1: Basic error handling with try-catch
  const handleBasicOperation = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(new Error('API request failed'));
        }, 1000);
      });

      showSuccess('Operation completed successfully!');
    } catch (error) {
      handleError(error, {
        toastTitle: 'Operation Failed',
        context: { operation: 'basicOperation' }
      });
    } finally {
      setLoading(false);
    }
  };

  // Example 2: Network error simulation
  const handleNetworkError = async () => {
    setLoading(true);
    try {
      throw createError(
        ErrorCode.NETWORK_ERROR,
        'Failed to connect to server',
        { url: '/api/data', method: 'GET' }
      );
    } catch (error) {
      handleError(error, {
        context: { operation: 'fetchData' }
      });
    } finally {
      setLoading(false);
    }
  };

  // Example 3: Validation error
  const handleValidationError = () => {
    const email = '';

    if (!email) {
      showError(
        'Email address is required',
        'Validation Error'
      );
      return;
    }

    showSuccess('Validation passed!');
  };

  // Example 4: Warning message
  const handleWarning = () => {
    showWarning(
      'This action cannot be undone. Please proceed with caution.',
      'Warning'
    );
  };

  // Example 5: Info message
  const handleInfo = () => {
    showInfo(
      'Your changes have been saved locally and will sync when online.',
      'Saved Locally'
    );
  };

  // Example 6: Storage error
  const handleStorageError = () => {
    try {
      throw createError(
        ErrorCode.STORAGE_QUOTA,
        'Local storage quota exceeded',
        { currentSize: '10MB', maxSize: '10MB' }
      );
    } catch (error) {
      handleError(error, {
        toastTitle: 'Storage Full',
        toastMessage: 'Unable to save. Please clear some space and try again.',
        context: { operation: 'saveData' }
      });
    }
  };

  // Example 7: Custom AppError
  const handleCustomError = () => {
    try {
      throw new AppError(
        ErrorCode.BUSINESS_ERROR,
        'Cannot delete item that is in use',
        {
          context: { itemId: '123', usedBy: ['workflow-1', 'workflow-2'] },
          isRecoverable: false
        }
      );
    } catch (error) {
      handleError(error, {
        toastTitle: 'Cannot Delete',
        toastMessage: 'This item is currently in use and cannot be deleted.'
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Error Handling System Examples</h1>

      <div className="space-y-6">
        <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Success & Info Messages</h2>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleInfo}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Show Info
            </button>
            <button
              onClick={handleWarning}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              Show Warning
            </button>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Error Examples</h2>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleBasicOperation}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Basic Error'}
            </button>
            <button
              onClick={handleNetworkError}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Network Error
            </button>
            <button
              onClick={handleValidationError}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Validation Error
            </button>
            <button
              onClick={handleStorageError}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Storage Error
            </button>
            <button
              onClick={handleCustomError}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Custom Error
            </button>
          </div>
        </section>

        <section className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Usage Notes</h2>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li>• Errors are automatically logged with context</li>
            <li>• Toast notifications show user-friendly messages</li>
            <li>• Critical errors don't auto-dismiss</li>
            <li>• All errors include proper error codes and severity levels</li>
            <li>• Replace all alert() calls with showError/showSuccess</li>
            <li>• Replace console.error() with handleError for user-facing errors</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
