'use client';

import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../providers/AuthProvider';
import { safeParse, safeStringify, safeParseLocalStorage, safeSetLocalStorage } from "@/lib/utils/json-safe";
import { authLogger } from '@/lib/logger';

interface AuthDebugPanelProps {
  isVisible?: boolean;
}

interface DebugState {
  timestamp: string;
  zustandStore: any;
  localStorage: any;
  contextValue: any;
  userMenuProps: any;
  discrepancies: string[];
}

export const AuthDebugPanel: React.FC<AuthDebugPanelProps> = ({ 
  isVisible = process.env.NODE_ENV === 'development' 
}) => {
  const [debugState, setDebugState] = useState<DebugState | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [updateCount, setUpdateCount] = useState(0);
  
  const authContext = useContext(AuthContext);

  const captureDebugState = (): DebugState => {
    // Dynamically import authManager to avoid build issues
    let zustandState = { isAuthenticated: false, user: null, profile: null, isLoading: false };
    try {
      const { authManager } = require('../../lib/auth/authManager');
      zustandState = authManager.getState();
    } catch (error) {
      authLogger.warn('Could not access authManager:', { error: error instanceof Error ? error.message : String(error) });
    }
    
    let localStorageData = null;
    try {
      const stored = localStorage.getItem('describe-it-auth');
      localStorageData = stored ? safeParse(stored) : null;
    } catch (error) {
      localStorageData = { error: 'Failed to parse localStorage data' };
    }

    const userMenuProps = {
      isAuthenticated: zustandState.isAuthenticated,
      user: zustandState.user,
      profile: zustandState.profile,
      isLoading: zustandState.isLoading,
    };

    // Detect discrepancies
    const discrepancies: string[] = [];
    
    if (authContext?.isAuthenticated !== zustandState.isAuthenticated) {
      discrepancies.push('isAuthenticated mismatch between Context and Zustand');
    }
    
    if (safeStringify(authContext?.user) !== safeStringify(zustandState.user)) {
      discrepancies.push('user data mismatch between Context and Zustand');
    }
    
    if (safeStringify(authContext?.profile) !== safeStringify(zustandState.profile)) {
      discrepancies.push('profile data mismatch between Context and Zustand');
    }

    if (localStorageData && localStorageData.user && !zustandState.isAuthenticated) {
      discrepancies.push('localStorage has user data but Zustand shows unauthenticated');
    }

    if (!localStorageData && zustandState.isAuthenticated) {
      discrepancies.push('Zustand shows authenticated but localStorage is empty');
    }

    return {
      timestamp: new Date().toISOString(),
      zustandStore: {
        isAuthenticated: zustandState.isAuthenticated,
        user: zustandState.user,
        profile: zustandState.profile,
        isLoading: zustandState.isLoading,
      },
      localStorage: localStorageData,
      contextValue: {
        isAuthenticated: authContext?.isAuthenticated,
        user: authContext?.user,
        profile: authContext?.profile,
        isLoading: authContext?.isLoading,
      },
      userMenuProps,
      discrepancies,
    };
  };

  useEffect(() => {
    if (!isVisible) return;

    // Initial capture
    setDebugState(captureDebugState());

    // Set up interval to update every second
    const interval = setInterval(() => {
      setDebugState(captureDebugState());
      setUpdateCount(prev => prev + 1);
    }, 1000);

    // Also listen to auth state changes
    let unsubscribe = () => {};
    try {
      const { authManager } = require('../../lib/auth/authManager');
      unsubscribe = authManager.subscribe((state: any) => {
        authLogger.info('[AUTH_DEBUG] Zustand state changed:', state);
        setDebugState(captureDebugState());
      });
    } catch (error) {
      authLogger.warn('Could not subscribe to authManager:', { error: error instanceof Error ? error.message : String(error) });
    }

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, authContext]); // captureDebugState is stable

  if (!isVisible || !debugState) {
    return null;
  }

  const formatJson = (obj: any) => {
    return safeStringify(obj, '{}');
  };

  const getStatusColor = (hasDiscrepancies: boolean) => {
    return hasDiscrepancies ? '#ff4444' : '#44ff44';
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: isExpanded ? '600px' : '200px',
        maxHeight: '80vh',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        border: `2px solid ${getStatusColor(debugState.discrepancies.length > 0)}`,
        borderRadius: '8px',
        padding: '12px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 10000,
        overflow: 'auto',
        transition: 'all 0.3s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
          cursor: 'pointer',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <strong>🔍 Auth Debug Panel</strong>
        <span style={{ fontSize: '10px' }}>
          Updates: {updateCount} | {isExpanded ? '−' : '+'}
        </span>
      </div>

      {debugState.discrepancies.length > 0 && (
        <div
          style={{
            backgroundColor: '#ff4444',
            color: 'white',
            padding: '8px',
            borderRadius: '4px',
            marginBottom: '8px',
          }}
        >
          <strong>⚠️ DISCREPANCIES DETECTED:</strong>
          {debugState.discrepancies.map((discrepancy, index) => (
            <div key={index} style={{ marginTop: '4px' }}>
              • {discrepancy}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: '8px', fontSize: '10px', opacity: 0.8 }}>
        Last Update: {new Date(debugState.timestamp).toLocaleTimeString()}
      </div>

      {isExpanded && (
        <div>
          <div style={{ marginBottom: '12px' }}>
            <strong style={{ color: '#ffff44' }}>📊 Zustand Store:</strong>
            <pre style={{ margin: '4px 0', fontSize: '10px', whiteSpace: 'pre-wrap' }}>
              {formatJson(debugState.zustandStore)}
            </pre>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <strong style={{ color: '#44ffff' }}>🌐 Context Value:</strong>
            <pre style={{ margin: '4px 0', fontSize: '10px', whiteSpace: 'pre-wrap' }}>
              {formatJson(debugState.contextValue)}
            </pre>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <strong style={{ color: '#ff44ff' }}>💾 localStorage:</strong>
            <pre style={{ margin: '4px 0', fontSize: '10px', whiteSpace: 'pre-wrap' }}>
              {formatJson(debugState.localStorage)}
            </pre>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <strong style={{ color: '#44ff44' }}>🎛️ UserMenu Props:</strong>
            <pre style={{ margin: '4px 0', fontSize: '10px', whiteSpace: 'pre-wrap' }}>
              {formatJson(debugState.userMenuProps)}
            </pre>
          </div>

          <div style={{ marginTop: '12px', fontSize: '10px', opacity: 0.7 }}>
            <strong>Quick Actions:</strong>
            <div style={{ marginTop: '4px' }}>
              <button
                onClick={() => {
                  localStorage.removeItem('describe-it-auth');
                  try {
                    const { authManager } = require('../../lib/auth/authManager');
                    authManager.getState().signOut();
                  } catch (error) {
                    authLogger.warn('Could not access authManager for signOut:', { error: error instanceof Error ? error.message : String(error) });
                  }
                }}
                style={{
                  backgroundColor: '#ff4444',
                  color: 'white',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  marginRight: '8px',
                  cursor: 'pointer',
                }}
              >
                Clear All Auth
              </button>
              <button
                onClick={() => {
                  authLogger.info('[AUTH_DEBUG] Current state:', captureDebugState());
                }}
                style={{
                  backgroundColor: '#4444ff',
                  color: 'white',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  cursor: 'pointer',
                }}
              >
                Log to Console
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: '8px',
          fontSize: '10px',
          opacity: 0.6,
          textAlign: 'center',
        }}
      >
        Status: {debugState.discrepancies.length === 0 ? '✅ Synced' : '❌ Out of Sync'}
      </div>
    </div>
  );
};

export default AuthDebugPanel;