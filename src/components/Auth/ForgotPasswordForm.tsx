'use client';
import { logger } from '@/lib/logger';

import React, { useState } from 'react';
import { Mail, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';

interface ForgotPasswordFormProps {
  onBack?: () => void;
  onSuccess?: (email: string) => void;
  apiEndpoint?: string;
}

export function ForgotPasswordForm({
  onBack,
  onSuccess,
  apiEndpoint = '/api/auth/forgot-password'
}: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [resendTimer, setResendTimer] = useState(0);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setError(null);

    // Validate email
    if (!email) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Prevent multiple submissions
    if (loading || !canResend) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error codes
        if (response.status === 404) {
          setError('No account found with this email address');
        } else if (response.status === 429) {
          setError('Too many requests. Please try again later');
        } else if (response.status === 500) {
          setError('Server error. Please try again later');
        } else {
          setError(data.error || 'Failed to send reset email');
        }
        setLoading(false);
        return;
      }

      // Success
      setSuccess(true);
      setCanResend(false);

      // Start resend timer (60 seconds)
      let timer = 60;
      setResendTimer(timer);
      const interval = setInterval(() => {
        timer--;
        setResendTimer(timer);
        if (timer <= 0) {
          clearInterval(interval);
          setCanResend(true);
        }
      }, 1000);

      if (onSuccess) {
        onSuccess(email);
      }

    } catch (err: any) {
      logger.error('Forgot password error', err, { context: 'ForgotPasswordForm' });
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Network error. Please check your connection');
      } else {
        setError('An unexpected error occurred. Please try again');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    if (canResend && !loading) {
      setSuccess(false);
      handleSubmit(new Event('submit') as any);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  return (
    <div className="w-full max-w-md">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
          aria-label="Back to login"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to login</span>
        </button>
      )}

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Reset Your Password
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      {error && (
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
          <div className="flex items-start gap-2 mb-2">
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Check your email</p>
              <p className="mt-1">
                We&apos;ve sent a password reset link to <strong>{email}</strong>
              </p>
            </div>
          </div>
          {!canResend && (
            <p className="text-xs mt-2">
              Didn&apos;t receive it? You can resend in {resendTimer} seconds
            </p>
          )}
          {canResend && (
            <button
              onClick={handleResend}
              className="text-xs underline hover:no-underline mt-2"
              aria-label="Resend reset email"
            >
              Resend email
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label
            htmlFor="forgot-email"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="you@example.com"
              required
              aria-required="true"
              aria-invalid={!!error}
              aria-describedby={error ? 'email-error' : undefined}
              disabled={loading}
            />
          </div>
          {error && (
            <p id="email-error" className="sr-only">
              {error}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || (!canResend && success)}
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
              <span>Sending...</span>
            </>
          ) : (
            'Send Reset Link'
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        <p>
          Remember your password?{' '}
          {onBack && (
            <button
              onClick={onBack}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Sign in
            </button>
          )}
        </p>
      </div>
    </div>
  );
}
