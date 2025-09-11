'use client';

import React from 'react';
import { useAuth } from '@/providers/AuthProvider';

export function AuthDebugPanel() {
  const auth = useAuth();
  
  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg text-xs max-w-sm">
      <h3 className="font-bold mb-2">Auth Debug Panel</h3>
      <div className="space-y-1">
        <div>Authenticated: {auth.isAuthenticated ? '✅' : '❌'}</div>
        <div>User: {auth.user?.email || 'None'}</div>
        <div>Profile: {auth.profile?.full_name || 'None'}</div>
        <div>Version: {auth.version}</div>
        <div>Refresh Key: {auth.refreshKey}</div>
        <div>Loading: {auth.isLoading ? 'Yes' : 'No'}</div>
        <div>Error: {auth.error || 'None'}</div>
        <div className="mt-2 pt-2 border-t border-gray-600">
          <div className="text-xs text-gray-400">
            Last Update: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}