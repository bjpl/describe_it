import { useState, useEffect, useCallback } from 'react';
import { authManager, type UserProfile } from '../lib/auth/AuthManager';
import { settingsManager, type AppSettings } from '../lib/settings/settingsManager';
import { logger } from '../lib/logger';
import { safeParse, safeStringify, safeParseLocalStorage, safeSetLocalStorage } from "@/lib/utils/json-safe";

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: string;
  optional?: boolean;
  completed?: boolean;
}

export interface OnboardingState {
  currentStep: number;
  steps: OnboardingStep[];
  isLoading: boolean;
  isComplete: boolean;
  canSkip: boolean;
  progress: number;
  userData: Partial<UserProfile>;
  preferences: Partial<AppSettings>;
}

export interface OnboardingActions {
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  skipStep: () => void;
  skipOnboarding: () => void;
  updateUserData: (data: Partial<UserProfile>) => void;
  updatePreferences: (prefs: Partial<AppSettings>) => void;
  completeOnboarding: () => Promise<boolean>;
  restartOnboarding: () => void;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Describe It!',
    description: 'Let\'s get you started with your language learning journey',
    component: 'WelcomeStep'
  },
  {
    id: 'api-keys',
    title: 'Set Up API Keys',
    description: 'Connect your API keys for enhanced features',
    component: 'ApiKeySetup',
    optional: true
  },
  {
    id: 'preferences',
    title: 'Learning Preferences',
    description: 'Customize your learning experience',
    component: 'PreferencesSetup'
  },
  {
    id: 'tutorial',
    title: 'Feature Tour',
    description: 'Discover what you can do with the app',
    component: 'TutorialStep'
  },
  {
    id: 'completion',
    title: 'You\'re All Set!',
    description: 'Start your learning journey',
    component: 'CompletionStep'
  }
];

const STORAGE_KEY = 'onboarding-progress';
const COMPLETION_KEY = 'onboarding-completed';

export function useOnboarding(): OnboardingState & OnboardingActions {
  const [state, setState] = useState<OnboardingState>(() => ({
    currentStep: 0,
    steps: ONBOARDING_STEPS,
    isLoading: false,
    isComplete: false,
    canSkip: true,
    progress: 0,
    userData: {},
    preferences: {}
  }));

  // Check if onboarding is completed
  const checkCompletionStatus = useCallback(() => {
    if (typeof window === 'undefined') return false;
    
    const isCompleted = localStorage.getItem(COMPLETION_KEY) === 'true';
    const currentUser = authManager.getCurrentProfile();
    
    // If user has completed onboarding before, mark as complete
    if (isCompleted || (currentUser?.preferences && Object.keys(currentUser.preferences).length > 0)) {
      setState(prev => ({ ...prev, isComplete: true, progress: 100 }));
      return true;
    }
    
    return false;
  }, []);

  // Load saved progress
  const loadProgress = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const savedProgress = localStorage.getItem(STORAGE_KEY);
      if (savedProgress) {
        const { currentStep, userData, preferences, completedSteps } = safeParse(savedProgress);
        
        // Update steps with completion status
        const updatedSteps = ONBOARDING_STEPS.map((step, index) => ({
          ...step,
          completed: completedSteps?.includes(step.id) || index < currentStep
        }));
        
        setState(prev => ({
          ...prev,
          currentStep: Math.min(currentStep || 0, ONBOARDING_STEPS.length - 1),
          steps: updatedSteps,
          userData: userData || {},
          preferences: preferences || {},
          progress: Math.round(((currentStep || 0) / ONBOARDING_STEPS.length) * 100)
        }));
      }
    } catch (error) {
      logger.error('Failed to load onboarding progress', error as Error);
    }
  }, []);

  // Save progress to localStorage
  const saveProgress = useCallback((newState: Partial<OnboardingState>) => {
    if (typeof window === 'undefined') return;
    
    try {
      const progressData = {
        currentStep: newState.currentStep ?? state.currentStep,
        userData: newState.userData ?? state.userData,
        preferences: newState.preferences ?? state.preferences,
        completedSteps: (newState.steps ?? state.steps)
          .filter(step => step.completed)
          .map(step => step.id),
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem(STORAGE_KEY, safeStringify(progressData));
    } catch (error) {
      logger.error('Failed to save onboarding progress', error as Error);
    }
  }, [state]);

  // Initialize onboarding
  useEffect(() => {
    if (!checkCompletionStatus()) {
      loadProgress();
    }
  }, [checkCompletionStatus, loadProgress]);

  // Actions
  const nextStep = useCallback(() => {
    setState(prev => {
      if (prev.currentStep < prev.steps.length - 1) {
        const newStep = prev.currentStep + 1;
        const updatedSteps = prev.steps.map((step, index) => ({
          ...step,
          completed: index < newStep ? true : step.completed
        }));
        
        const newState = {
          ...prev,
          currentStep: newStep,
          steps: updatedSteps,
          progress: Math.round((newStep / prev.steps.length) * 100)
        };
        
        saveProgress(newState);
        return newState;
      }
      return prev;
    });
  }, [saveProgress]);

  const prevStep = useCallback(() => {
    setState(prev => {
      if (prev.currentStep > 0) {
        const newStep = prev.currentStep - 1;
        const newState = {
          ...prev,
          currentStep: newStep,
          progress: Math.round((newStep / prev.steps.length) * 100)
        };
        
        saveProgress(newState);
        return newState;
      }
      return prev;
    });
  }, [saveProgress]);

  const goToStep = useCallback((step: number) => {
    setState(prev => {
      const clampedStep = Math.max(0, Math.min(step, prev.steps.length - 1));
      const updatedSteps = prev.steps.map((stepData, index) => ({
        ...stepData,
        completed: index < clampedStep ? true : stepData.completed
      }));
      
      const newState = {
        ...prev,
        currentStep: clampedStep,
        steps: updatedSteps,
        progress: Math.round((clampedStep / prev.steps.length) * 100)
      };
      
      saveProgress(newState);
      return newState;
    });
  }, [saveProgress]);

  const skipStep = useCallback(() => {
    const currentStepData = state.steps[state.currentStep];
    if (currentStepData?.optional) {
      nextStep();
    }
  }, [state.steps, state.currentStep, nextStep]);

  const skipOnboarding = useCallback(() => {
    setState(prev => ({
      ...prev,
      isComplete: true,
      progress: 100,
      currentStep: prev.steps.length - 1
    }));
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(COMPLETION_KEY, 'true');
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const updateUserData = useCallback((data: Partial<UserProfile>) => {
    setState(prev => {
      const newState = {
        ...prev,
        userData: { ...prev.userData, ...data }
      };
      saveProgress(newState);
      return newState;
    });
  }, [saveProgress]);

  const updatePreferences = useCallback((prefs: Partial<AppSettings>) => {
    setState(prev => {
      const newState = {
        ...prev,
        preferences: { ...prev.preferences, ...prefs }
      };
      saveProgress(newState);
      return newState;
    });
  }, [saveProgress]);

  const completeOnboarding = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const currentUser = authManager.getCurrentUser();
      
      if (currentUser) {
        // Save user profile updates
        if (Object.keys(state.userData).length > 0) {
          const success = await authManager.updateProfile(state.userData);
          if (!success) {
            throw new Error('Failed to update user profile');
          }
        }
        
        // Save user preferences with onboarding completion flag
        const preferencesToSave = {
          ...state.preferences,
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString()
        };
        
        if (Object.keys(state.preferences).length > 0) {
          settingsManager.updateSettings(state.preferences);
        }
        
        // Update user profile to include onboarding completion
        const currentPrefs = authManager.getCurrentProfile()?.preferences || {};
        await authManager.updateProfile({
          preferences: {
            ...currentPrefs,
            onboarding_completed: true,
            onboarding_completed_at: new Date().toISOString()
          } as any
        });
      } else {
        // For guest users, just save to local settings
        const preferencesToSave = {
          ...state.preferences,
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString()
        };
        
        settingsManager.updateSettings(preferencesToSave);
      }
      
      // Mark onboarding as complete
      if (typeof window !== 'undefined') {
        localStorage.setItem(COMPLETION_KEY, 'true');
        localStorage.removeItem(STORAGE_KEY);
      }
      
      setState(prev => ({
        ...prev,
        isComplete: true,
        isLoading: false,
        progress: 100,
        currentStep: prev.steps.length - 1
      }));
      
      logger.info('Onboarding completed successfully');
      return true;
    } catch (error) {
      logger.error('Failed to complete onboarding', error as Error);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [state.userData, state.preferences]);

  const restartOnboarding = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(COMPLETION_KEY);
      localStorage.removeItem(STORAGE_KEY);
    }
    
    setState({
      currentStep: 0,
      steps: ONBOARDING_STEPS,
      isLoading: false,
      isComplete: false,
      canSkip: true,
      progress: 0,
      userData: {},
      preferences: {}
    });
  }, []);

  return {
    ...state,
    nextStep,
    prevStep,
    goToStep,
    skipStep,
    skipOnboarding,
    updateUserData,
    updatePreferences,
    completeOnboarding,
    restartOnboarding
  };
}

export default useOnboarding;