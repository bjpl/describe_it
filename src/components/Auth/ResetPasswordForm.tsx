'use client';
import { logger } from '@/lib/logger';

import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ResetPasswordFormProps {
  token: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  apiEndpoint?: string;
  autoLogin?: boolean;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

export function ResetPasswordForm({
  token,
  onSuccess,
  onCancel,
  apiEndpoint = '/api/auth/reset-password',
  autoLogin = false
}: ResetPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Validate token on mount
  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await fetch(`${apiEndpoint}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setError('This reset link has expired. Please request a new one.');
          setTokenValid(false);
        } else if (response.status === 404) {
          setError('Invalid reset link. Please request a new one.');
          setTokenValid(false);
        } else {
          setError(data.error || 'Failed to validate reset link');
          setTokenValid(false);
        }
      } else {
        setTokenValid(true);
      }
    } catch (err) {
      logger.error('Token validation error', err, { context: 'ResetPasswordForm', action: 'validateToken' });
      setError('Network error. Please check your connection');
      setTokenValid(false);
    }
  };

  const calculatePasswordStrength = (password: string): PasswordStrength => {
    let score = 0;

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
    if (score <= 4) return { score, label: 'Medium', color: 'bg-yellow-500' };
    return { score, label: 'Strong', color: 'bg-green-500' };
  };

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[^a-zA-Z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return errors;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);

    // Clear errors when typing
    if (error) setError(null);

    // Validate password
    if (newPassword) {
      const errors = validatePassword(newPassword);
      setValidationErrors(errors);
    } else {
      setValidationErrors([]);
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setError(null);

    // Validate passwords
    if (!password) {
      setError('Password is required');
      return;
    }

    if (!confirmPassword) {
      setError('Please confirm your password');
      return;
    }

    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      setError(passwordErrors[0]);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (loading) return;

    setLoading(true);

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password,
          autoLogin
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setError('This reset link has expired. Please request a new one.');
          setTokenValid(false);
        } else if (response.status === 404) {
          setError('Invalid reset link. Please request a new one.');
          setTokenValid(false);
        } else if (response.status === 429) {
          setError('Too many attempts. Please try again later');
        } else {
          setError(data.error || 'Failed to reset password');
        }
        setLoading(false);
        return;
      }

      // Success
      setSuccess(true);

      if (onSuccess) {
        onSuccess();
      }

      // Auto-login if enabled and session data is returned
      if (autoLogin && data.session) {
        localStorage.setItem('describe-it-auth', JSON.stringify(data.session));

        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }

    } catch (err: any) {
      logger.error('Reset password error', err, { context: 'ResetPasswordForm', action: 'submit' });
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Network error. Please check your connection');
      } else {
        setError('An unexpected error occurred. Please try again');
      }
      setLoading(false);
    }
  };

  const passwordStrength = password ? calculatePasswordStrength(password) : null;

  // Show token validation error
  if (tokenValid === false) {
    return (
      <div className="w-full max-w-md">
        <div
          className="p-6 bg-red-50 border border-red-200 rounded-lg"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">Invalid Reset Link</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/forgot-password')}
            className="mt-4 w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Request New Reset Link
          </button>
        </div>
      </div>
    );
  }

  // Show loading while validating token
  if (tokenValid === null) {
    return (
      <div className="w-full max-w-md text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Validating reset link...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Create New Password
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Enter your new password below.
        </p>
      </div>

      {error && !success && (
        <div
          className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Password reset successful!</p>
              <p className="mt-1">
                {autoLogin ? 'Logging you in...' : 'Redirecting to login page...'}
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label
            htmlFor="new-password"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            New Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
            <input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={handlePasswordChange}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="••••••••"
              required
              aria-required="true"
              aria-invalid={!!validationErrors.length}
              aria-describedby="password-requirements"
              disabled={loading || success}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {passwordStrength && (
            <div className="mt-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`${passwordStrength.color} h-2 rounded-full transition-all`}
                    style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                  ></div>
                </div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {passwordStrength.label}
                </span>
              </div>
            </div>
          )}

          <div id="password-requirements" className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            {validationErrors.length > 0 ? (
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((err, idx) => (
                  <li key={idx} className="text-red-600 dark:text-red-400">
                    {err}
                  </li>
                ))}
              </ul>
            ) : password ? (
              <p className="text-green-600 dark:text-green-400 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Password meets all requirements
              </p>
            ) : (
              <ul className="list-disc list-inside space-y-1">
                <li>At least 8 characters</li>
                <li>One uppercase and one lowercase letter</li>
                <li>One number and one special character</li>
              </ul>
            )}
          </div>
        </div>

        <div className="mb-6">
          <label
            htmlFor="confirm-password"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Confirm New Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
            <input
              id="confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="••••••••"
              required
              aria-required="true"
              aria-invalid={!!(confirmPassword && password !== confirmPassword)}
              disabled={loading || success}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirmPassword && password !== confirmPassword && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <X className="w-3 h-3" />
              Passwords do not match
            </p>
          )}
          {confirmPassword && password === confirmPassword && (
            <p className="mt-1 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Passwords match
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || success || validationErrors.length > 0 || password !== confirmPassword}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          aria-busy={loading}
        >
          {loading ? (
            <>
              <svg
                className="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Resetting Password...</span>
            </>
          ) : success ? (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>Success!</span>
            </>
          ) : (
            'Reset Password'
          )}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full mt-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white py-2 transition-colors"
            disabled={loading || success}
          >
            Cancel
          </button>
        )}
      </form>
    </div>
  );
}
