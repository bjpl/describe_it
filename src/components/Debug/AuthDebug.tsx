'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { safeParse, safeStringify, safeParseLocalStorage, safeSetLocalStorage } from "@/lib/utils/json-safe";

// Test functions using the main client
async function testSupabaseConnection() {
  if (!supabase) {
    return {
      success: false,
      error: 'Supabase client not initialized',
      isBrowser: typeof window !== 'undefined'
    };
  }

  try {
    const { data, error } = await supabase.auth.getSession();
    return {
      success: !error,
      error: error?.message || null,
      hasSession: !!data?.session,
      timestamp: new Date().toISOString()
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Unknown error',
      stack: err.stack
    };
  }
}

async function testSignup(email: string, password: string) {
  if (!supabase) {
    return {
      success: false,
      error: 'Supabase client not initialized'
    };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      return {
        success: false,
        error: error.message,
        code: error.status,
        details: error
      };
    }

    return {
      success: true,
      user: data.user?.email,
      session: !!data.session,
      confirmationRequired: !data.session && !!data.user
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Unknown error'
    };
  }
}

export function AuthDebug() {
  const [connectionResult, setConnectionResult] = useState<any>(null);
  const [signupResult, setSignupResult] = useState<any>(null);
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('testpassword123');
  const [loading, setLoading] = useState(false);

  const handleTestConnection = async () => {
    setLoading(true);
    const result = await testSupabaseConnection();
    setConnectionResult(result);
    setLoading(false);
  };

  const handleTestSignup = async () => {
    setLoading(true);
    const result = await testSignup(email, password);
    setSignupResult(result);
    setLoading(false);
  };

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-md z-50">
      <h3 className="font-bold mb-2">Auth Debug Panel</h3>
      
      <div className="space-y-2 text-sm">
        <div>
          <strong>Environment:</strong>
          <ul className="ml-4 text-xs">
            <li>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</li>
            <li>Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</li>
          </ul>
        </div>

        <div className="border-t pt-2">
          <button
            onClick={handleTestConnection}
            disabled={loading}
            className="px-3 py-1 bg-blue-500 text-white rounded text-xs mr-2"
          >
            Test Connection
          </button>
          {connectionResult && (
            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
              {safeStringify(connectionResult, '{}')}
            </pre>
          )}
        </div>

        <div className="border-t pt-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full px-2 py-1 border rounded text-xs mb-1"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-2 py-1 border rounded text-xs mb-1"
          />
          <button
            onClick={handleTestSignup}
            disabled={loading}
            className="px-3 py-1 bg-green-500 text-white rounded text-xs"
          >
            Test Signup
          </button>
          {signupResult && (
            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
              {safeStringify(signupResult, '{}')}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}