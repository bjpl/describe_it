'use client';

/**
 * Auth Testing Page
 * Simple page to test and debug authentication flow
 */

import React, { useState } from 'react';
import { authLogger } from '@/lib/logger';

export default function TestAuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testSignup = async () => {
    setLoading(true);
    setResult(null);
    authLogger.info('[TestAuth] Starting signup test');

    try {
      const response = await fetch('/api/auth/simple-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      authLogger.info('[TestAuth] Signup result:', data);
      setResult({
        status: response.status,
        ...data,
      });
    } catch (error: any) {
      authLogger.error('[TestAuth] Signup error:', error);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testSignin = async () => {
    setLoading(true);
    setResult(null);
    authLogger.info('[TestAuth] Starting signin test');

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      authLogger.info('[TestAuth] Signin result:', data);
      setResult({
        status: response.status,
        ...data,
      });
    } catch (error: any) {
      authLogger.error('[TestAuth] Signin error:', error);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8 space-y-6">
          <h1 className="text-3xl font-bold text-gray-900">Auth Flow Test</h1>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••••••"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={testSignup}
                disabled={loading || !email || !password}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? 'Testing...' : 'Test Signup'}
              </button>

              <button
                onClick={testSignin}
                disabled={loading || !email || !password}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? 'Testing...' : 'Test Signin'}
              </button>
            </div>
          </div>

          {result && (
            <div className={`mt-6 p-4 rounded-lg ${
              result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <h3 className={`font-semibold mb-2 ${
                result.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {result.success ? '✅ Success' : '❌ Error'}
              </h3>
              <pre className="text-sm overflow-auto bg-white p-3 rounded border border-gray-200">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">📝 Testing Instructions:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>1. Enter an email and password (min 6 chars)</li>
              <li>2. Click "Test Signup" to create a new account</li>
              <li>3. Check your email for confirmation link</li>
              <li>4. After confirming, use "Test Signin" to log in</li>
              <li>5. Check browser console for detailed logs</li>
            </ul>
          </div>

          <div className="mt-4 text-center">
            <a href="/" className="text-blue-600 hover:text-blue-800 underline">
              ← Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
