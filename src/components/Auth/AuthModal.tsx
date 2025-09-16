'use client';

import React, { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useDirectAuth } from './useDirectAuth';
import { X, Mail, Lock, User, KeyRound, Github, Chrome } from 'lucide-react';
import { safeParse, safeStringify, safeParseLocalStorage, safeSetLocalStorage } from "@/lib/utils/json-safe";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
  onAuthSuccess?: (authData: { user: any; profile?: any }) => void;
}

export function AuthModal({ isOpen, onClose, initialMode = 'signin', onAuthSuccess }: AuthModalProps) {
  const { signIn, signUp, signInWithProvider } = useAuth();
  const { directSignIn, directSignUp } = useDirectAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    console.log('[AuthModal] Starting', mode, 'for', email);

    try {
      let result;
      
      // Try AuthManager first with a shorter timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timed out')), 5000)
      );
      
      try {
        const authPromise = mode === 'signin' 
          ? signIn(email, password)
          : signUp(email, password, { full_name: fullName });
        
        result = await Promise.race([authPromise, timeoutPromise]) as any;
      } catch (authError: any) {
        console.log('[AuthModal] AuthManager failed, trying direct auth');
        
        // Fallback to direct API call
        result = mode === 'signin'
          ? await directSignIn(email, password)
          : await directSignUp(email, password, { full_name: fullName });
      }
      
      console.log('[AuthModal] Result:', result);

      if (result?.success) {
        setSuccess(true);
        setLoading(false);
        
        // Set session storage flag for immediate UI feedback
        sessionStorage.setItem('recent-auth-success', Date.now().toString());
        
        // Dispatch custom event immediately for all components
        window.dispatchEvent(new CustomEvent('auth-state-changed', {
          detail: {
            isAuthenticated: true,
            user: result.user || { email },
            profile: result.profile
          }
        }));
        
        // Call success callback if provided
        if (onAuthSuccess) {
          onAuthSuccess({
            user: result.user || { email },
            profile: result.profile
          });
        }
        
        // Brief success message then close
        setTimeout(() => {
          // Reset form
          setEmail('');
          setPassword('');
          setFullName('');
          setSuccess(false);
          setError(null);
          
          // Close modal
          onClose();
          
          // Force page refresh as last resort if UI doesn't update
          setTimeout(() => {
            const currentAuth = localStorage.getItem('describe-it-auth');
            if (!currentAuth) {
              console.log('[AuthModal] UI sync failed, forcing page reload');
              window.location.reload();
            }
          }, 2000);
        }, 1500);
      } else {
        setError(result?.error || 'Authentication failed');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('[AuthModal] Error:', err);
      setError(err.message === 'Request timed out' 
        ? 'Request timed out. Please try again.' 
        : err.message || 'An unexpected error occurred');
      setLoading(false);
    }
  };

  const handleProviderSignIn = async (provider: 'google' | 'github' | 'discord') => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await signInWithProvider(provider);
      if (result.success) {
        // Set session storage flag
        sessionStorage.setItem('recent-auth-success', Date.now().toString());
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('auth-state-changed', {
          detail: {
            isAuthenticated: true,
            user: result.user,
            profile: result.profile
          }
        }));
        
        // Call success callback if provided
        if (onAuthSuccess) {
          onAuthSuccess({
            user: result.user,
            profile: result.profile
          });
        }
        
        // Close modal after brief delay
        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        setError(result.error || 'Failed to sign in with provider');
      }
    } catch (err) {
      console.error('[AuthModal] Provider sign in error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
            <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {mode === 'signin' ? 'Successfully signed in! Updating interface...' : 'Account created! Check your email to verify.'}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="John Doe"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Processing...</span>
              </>
            ) : success ? (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Success!</span>
              </>
            ) : (
              mode === 'signin' ? 'Sign In' : 'Sign Up'
            )}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => handleProviderSignIn('google')}
              disabled={loading}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Chrome className="w-4 h-4 mr-2" />
              Google
            </button>
            <button
              onClick={() => handleProviderSignIn('github')}
              disabled={loading}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Github className="w-4 h-4 mr-2" />
              GitHub
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          </span>
          <button
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
            }}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {mode === 'signin' ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}