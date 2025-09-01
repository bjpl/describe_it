'use client';

import React from 'react';
import { Wifi, WifiOff, AlertTriangle, CheckCircle } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface NetworkStatusIndicatorProps {
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export function NetworkStatusIndicator({
  showDetails = false,
  compact = false,
  className = ''
}: NetworkStatusIndicatorProps) {
  const { isOnline, isConnecting, lastOffline, connectionType, retry } = useNetworkStatus();

  const getStatusColor = () => {
    if (isConnecting) return 'text-yellow-500';
    return isOnline ? 'text-green-500' : 'text-red-500';
  };

  const getStatusIcon = () => {
    const iconClass = `w-4 h-4 ${getStatusColor()}`;
    
    if (isConnecting) {
      return <WifiOff className={`${iconClass} animate-pulse`} />;
    }
    
    return isOnline ? (
      <Wifi className={iconClass} />
    ) : (
      <WifiOff className={iconClass} />
    );
  };

  const getStatusText = () => {
    if (isConnecting) return 'Reconnecting...';
    return isOnline ? 'Online' : 'Offline';
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {getStatusIcon()}
        {!isOnline && (
          <button
            onClick={retry}
            className="text-xs text-blue-600 hover:text-blue-700"
            disabled={isConnecting}
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  // Don't show anything if online and no details requested
  if (isOnline && !showDetails) {
    return null;
  }

  return (
    <div className={`p-3 rounded-lg border ${className} ${
      isOnline 
        ? 'bg-green-50 border-green-200' 
        : 'bg-red-50 border-red-200'
    }`}>
      <div className="flex items-start gap-3">
        {getStatusIcon()}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium ${
              isOnline ? 'text-green-800' : 'text-red-800'
            }`}>
              {getStatusText()}
            </span>
            
            {connectionType && (
              <span className="text-xs text-gray-500 uppercase">
                {connectionType}
              </span>
            )}
          </div>
          
          {showDetails && (
            <>
              {!isOnline && lastOffline && (
                <p className="text-sm text-red-600 mt-1">
                  Connection lost {lastOffline.toLocaleTimeString()}
                </p>
              )}
              
              {isOnline && (
                <p className="text-sm text-green-600 mt-1">
                  All services available
                </p>
              )}
            </>
          )}
        </div>
        
        {!isOnline && (
          <button
            onClick={retry}
            disabled={isConnecting}
            className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? 'Connecting...' : 'Retry'}
          </button>
        )}
      </div>
    </div>
  );
}

// Global network status toast
export function NetworkStatusToast() {
  const { isOnline, isConnecting } = useNetworkStatus();
  const [showToast, setShowToast] = React.useState(false);
  const [wasOffline, setWasOffline] = React.useState(false);

  React.useEffect(() => {
    if (!isOnline && !isConnecting) {
      setShowToast(true);
      setWasOffline(true);
    } else if (isOnline && wasOffline) {
      // Show success toast briefly when coming back online
      setShowToast(true);
      const timer = setTimeout(() => {
        setShowToast(false);
        setWasOffline(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    } else if (isOnline) {
      setShowToast(false);
    }
  }, [isOnline, isConnecting, wasOffline]);

  if (!showToast) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2">
      <div className={`max-w-sm p-4 rounded-lg shadow-lg border ${
        isOnline 
          ? 'bg-green-50 border-green-200 text-green-800' 
          : 'bg-red-50 border-red-200 text-red-800'
      }`}>
        <div className="flex items-center gap-3">
          {isOnline ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-500" />
          )}
          
          <div className="flex-1">
            <p className="font-medium">
              {isOnline ? 'Back Online' : 'Connection Lost'}
            </p>
            <p className="text-sm opacity-90">
              {isOnline 
                ? 'All features are now available'
                : 'Some features may not work properly'
              }
            </p>
          </div>
          
          {!isOnline && (
            <button
              onClick={() => setShowToast(false)}
              className="text-red-600 hover:text-red-700"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}