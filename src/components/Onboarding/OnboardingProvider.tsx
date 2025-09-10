'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { OnboardingWizard } from './index';
import useOnboarding from '../../hooks/useOnboarding';
import { authManager } from '../../lib/auth/AuthManager';

interface OnboardingProviderProps {
  children: React.ReactNode;
  autoShow?: boolean;
  forceShow?: boolean;
}

interface OnboardingContextType {
  showOnboarding: () => void;
  hideOnboarding: () => void;
  isOnboardingVisible: boolean;
  shouldShowOnboarding: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ 
  children, 
  autoShow = true,
  forceShow = false 
}: OnboardingProviderProps) {
  const { isComplete } = useOnboarding();
  const [isVisible, setIsVisible] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const checkOnboardingStatus = () => {
      if (forceShow) {
        setShouldShow(true);
        if (autoShow) setIsVisible(true);
        return;
      }

      const currentUser = authManager.getCurrentUser();
      const hasCompletedOnboarding = localStorage.getItem('onboarding-completed') === 'true';
      const userHasPreferences = currentUser && 
        authManager.getCurrentProfile()?.preferences &&
        Object.keys(authManager.getCurrentProfile()?.preferences || {}).length > 0;

      // Show onboarding if:
      // 1. User hasn't completed onboarding before
      // 2. User doesn't have preferences set
      // 3. Not already marked as complete
      if (!hasCompletedOnboarding && !userHasPreferences && !isComplete) {
        setShouldShow(true);
        if (autoShow) {
          // Delay showing onboarding to allow page to load
          const timer = setTimeout(() => setIsVisible(true), 1000);
          return () => clearTimeout(timer);
        }
      }
    };

    checkOnboardingStatus();
  }, [autoShow, forceShow, isComplete]);

  const showOnboarding = () => setIsVisible(true);
  const hideOnboarding = () => setIsVisible(false);

  const handleComplete = () => {
    setIsVisible(false);
    setShouldShow(false);
  };

  const contextValue: OnboardingContextType = {
    showOnboarding,
    hideOnboarding,
    isOnboardingVisible: isVisible,
    shouldShowOnboarding: shouldShow
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
      
      {shouldShow && (
        <OnboardingWizard
          isOpen={isVisible}
          onClose={hideOnboarding}
          onComplete={handleComplete}
        />
      )}
    </OnboardingContext.Provider>
  );
}

export function useOnboardingContext() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboardingContext must be used within an OnboardingProvider');
  }
  return context;
}

export default OnboardingProvider;