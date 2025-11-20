'use client';

import { useState } from 'react';
import { logger } from '@/lib/logger';

export default function TestAPIKey() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAPIKey = async () => {
    setLoading(true);
    try {
      // Get API key from localStorage
      const apiKey = localStorage.getItem('openai_api_key') || '';
      
      // Do not log API keys for security reasons
      
      // Test the verify endpoint
      const verifyResponse = await fetch('/api/test/verify-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userApiKey: apiKey
        })
      });
      
      const verifyResult = await verifyResponse.json();
      
      // Test actual description generation
      const describeResponse = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          style: 'narrativo',
          maxLength: 200,
          userApiKey: apiKey
        })
      });
      
      const describeResult = await describeResponse.json();
      
      setResults({
        verify: verifyResult,
        describe: describeResult
      });
      
    } catch (error) {
      logger.error('Test failed:', error);
      setResults({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">API Key Test Page</h1>
      
      <div className="mb-4">
        <p className="text-gray-600">
          This page tests whether the API key is being passed correctly through the request body (Vercel-compatible approach).
        </p>
      </div>
      
      <button
        onClick={testAPIKey}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test API Key Flow'}
      </button>
      
      {results && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">Results:</h2>
          
          <div className="bg-gray-100 p-4 rounded mb-4">
            <h3 className="font-semibold mb-2">Verify Endpoint:</h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(results.verify, null, 2)}
            </pre>
          </div>
          
          {results.describe && (
            <div className="bg-gray-100 p-4 rounded">
              <h3 className="font-semibold mb-2">Description Generation:</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(results.describe, null, 2)}
              </pre>
            </div>
          )}
          
          {results.error && (
            <div className="bg-red-100 p-4 rounded">
              <h3 className="font-semibold mb-2 text-red-700">Error:</h3>
              <p className="text-red-600">{results.error}</p>
            </div>
          )}
        </div>
      )}
      
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-semibold text-yellow-800 mb-2">Setup Instructions:</h3>
        <ol className="list-decimal list-inside text-sm text-yellow-700 space-y-1">
          <li>Go to Settings and add your OpenAI API key</li>
          <li>Click &quot;Test API Key Flow&quot; above</li>
          <li>Check if &quot;keyReceived&quot; is true and &quot;keySource&quot; is &quot;user&quot;</li>
          <li>Verify that descriptions are NOT in demo mode</li>
        </ol>
      </div>
    </div>
  );
}