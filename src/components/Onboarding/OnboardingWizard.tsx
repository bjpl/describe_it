'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';
import useOnboarding from '../../hooks/useOnboarding';
import WelcomeStep from './WelcomeStep';
import ApiKeySetup from './ApiKeySetup';
import PreferencesSetup from './PreferencesSetup';
import TutorialStep from './TutorialStep';
import CompletionStep from './CompletionStep';
import { logger } from '@/lib/logger';

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  className?: string;
}

const stepComponents = {
  WelcomeStep,
  ApiKeySetup,
  PreferencesSetup,
  TutorialStep,
  CompletionStep
};

// Animation variants
const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    y: 50
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30
    }
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: -20,
    transition: {
      duration: 0.2
    }
  }
};

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 300 : -300,
    opacity: 0
  })
};

const progressVariants = {
  hidden: { width: 0 },
  visible: (progress: number) => ({
    width: `${progress}%`,
    transition: {
      duration: 0.5,
      ease: 'easeInOut'
    }
  })
};

export default function OnboardingWizard({
  isOpen,
  onClose,
  onComplete,
  className = ''
}: OnboardingWizardProps) {
  const {
    currentStep,
    steps,
    isLoading,
    isComplete,
    canSkip,
    progress,
    nextStep,
    prevStep,
    skipStep,
    skipOnboarding,
    completeOnboarding
  } = useOnboarding();

  const [direction, setDirection] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;
  const canSkipCurrentStep = currentStepData?.optional && canSkip;

  // Handle onboarding completion
  useEffect(() => {
    if (isComplete) {
      onComplete();
    }
  }, [isComplete, onComplete]);

  // Handle visibility with animation delay
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setDirection(1);
      nextStep();
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setDirection(-1);
      prevStep();
    }
  };

  const handleSkipStep = () => {
    if (canSkipCurrentStep) {
      setDirection(1);
      skipStep();
    }
  };

  const handleSkipAll = () => {
    skipOnboarding();
    onComplete();
  };

  const handleComplete = async () => {
    const success = await completeOnboarding();
    if (success) {
      onComplete();
    }
  };

  const renderStepComponent = () => {
    const StepComponent = stepComponents[currentStepData.component as keyof typeof stepComponents];
    
    if (!StepComponent) {
      logger.error(`Step component ${currentStepData.component} not found`);
      return <div className="p-8 text-center">Step not found</div>;
    }

    return (
      <StepComponent
        onNext={handleNext}
        onPrev={handlePrev}
        onSkip={canSkipCurrentStep ? handleSkipStep : undefined}
        isLoading={isLoading}
        className="w-full h-full"
      />
    );
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isOpen ? 1 : 0 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`
              relative w-full max-w-4xl mx-4 bg-white dark:bg-gray-900 
              rounded-2xl shadow-2xl overflow-hidden
              min-h-[600px] max-h-[90vh] flex flex-col
              ${className}
            `}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {currentStepData.title}
                </h2>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Step {currentStep + 1} of {steps.length}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {canSkip && !isLastStep && (
                  <button
                    onClick={handleSkipAll}
                    className="
                      flex items-center space-x-1 px-3 py-1 text-sm
                      text-gray-600 hover:text-gray-800 dark:text-gray-400 
                      dark:hover:text-gray-200 transition-colors
                    "
                  >
                    <SkipForward className="h-4 w-4" />
                    <span>Skip Tour</span>
                  </button>
                )}
                
                <button
                  onClick={onClose}
                  className="
                    p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                    transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800
                  "
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-gray-200 dark:bg-gray-700">
              <motion.div
                variants={progressVariants}
                initial="hidden"
                animate="visible"
                custom={progress}
                className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-r-full"
              />
            </div>

            {/* Step Content */}
            <div className="flex-1 overflow-hidden relative">
              <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div
                  key={currentStep}
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 }
                  }}
                  className="absolute inset-0 overflow-y-auto"
                >
                  {renderStepComponent()}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer Navigation */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handlePrev}
                disabled={isFirstStep}
                className="
                  flex items-center space-x-2 px-4 py-2 text-gray-600 
                  hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200
                  disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                "
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>

              <div className="flex items-center space-x-3">
                {/* Step Indicators */}
                <div className="flex space-x-2">
                  {steps.map((step, index) => (
                    <div
                      key={step.id}
                      className={`
                        w-2 h-2 rounded-full transition-all duration-300
                        ${index === currentStep 
                          ? 'bg-blue-500 scale-125' 
                          : index < currentStep 
                            ? 'bg-green-500' 
                            : 'bg-gray-300 dark:bg-gray-600'
                        }
                      `}
                    />
                  ))}
                </div>

                {canSkipCurrentStep && (
                  <button
                    onClick={handleSkipStep}
                    className="
                      px-3 py-1 text-sm text-gray-600 hover:text-gray-800 
                      dark:text-gray-400 dark:hover:text-gray-200 transition-colors
                    "
                  >
                    Skip
                  </button>
                )}

                <button
                  onClick={handleNext}
                  disabled={isLoading}
                  className="
                    flex items-center space-x-2 px-6 py-2 bg-blue-600 
                    hover:bg-blue-700 text-white rounded-lg transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed
                    min-w-[100px] justify-center
                  "
                >
                  {isLoading ? (
                    <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                  ) : (
                    <>
                      <span>{isLastStep ? 'Complete' : 'Next'}</span>
                      {!isLastStep && <ChevronRight className="h-4 w-4" />}
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}