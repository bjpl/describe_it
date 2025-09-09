"use client";

import { useState, useCallback, useEffect } from "react";
import { X, ChevronRight, ChevronLeft, ExternalLink, Check, Loader2, Key, Image, Brain, Shield } from "lucide-react";
import { settingsManager } from "@/lib/settings/settingsManager";
import { ApiKeyInput } from "./Settings/ApiKeyInput";

interface ApiKeySetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

type WizardStep = "welcome" | "unsplash" | "openai" | "complete";

export function ApiKeySetupWizard({ isOpen, onClose, onComplete }: ApiKeySetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>("welcome");
  const [keys, setKeys] = useState({
    unsplash: "",
    openai: ""
  });
  const [validation, setValidation] = useState({
    unsplash: null as boolean | null,
    openai: null as boolean | null
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Load existing keys if any
      const settings = settingsManager.getSettings();
      setKeys({
        unsplash: settings.apiKeys.unsplash || "",
        openai: settings.apiKeys.openai || ""
      });
    }
  }, [isOpen]);

  const handleNext = useCallback(() => {
    const steps: WizardStep[] = ["welcome", "unsplash", "openai", "complete"];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  }, [currentStep]);

  const handlePrevious = useCallback(() => {
    const steps: WizardStep[] = ["welcome", "unsplash", "openai", "complete"];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    handleNext();
  }, [handleNext]);

  const validateUnsplash = useCallback(async () => {
    if (!keys.unsplash) return false;
    
    try {
      const result = await settingsManager.validateApiKeys();
      setValidation(prev => ({ ...prev, unsplash: result.unsplash }));
      return result.unsplash;
    } catch {
      setValidation(prev => ({ ...prev, unsplash: false }));
      return false;
    }
  }, [keys.unsplash]);

  const validateOpenAI = useCallback(async () => {
    if (!keys.openai) return false;
    
    try {
      const result = await settingsManager.validateApiKeys();
      setValidation(prev => ({ ...prev, openai: result.openai }));
      return result.openai;
    } catch {
      setValidation(prev => ({ ...prev, openai: false }));
      return false;
    }
  }, [keys.openai]);

  const handleSaveAndComplete = useCallback(async () => {
    setSaving(true);
    try {
      // Save the API keys
      settingsManager.updateSection("apiKeys", keys);
      
      // Mark setup as complete
      settingsManager.updateSection("general", { hasCompletedSetup: true });
      
      if (onComplete) {
        onComplete();
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }, [keys, onClose, onComplete]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">API Key Setup</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4 flex items-center justify-between">
            {["Welcome", "Unsplash", "OpenAI", "Complete"].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center font-semibold
                  ${index <= ["welcome", "unsplash", "openai", "complete"].indexOf(currentStep)
                    ? "bg-white text-blue-600"
                    : "bg-white/30 text-white/70"
                  }
                `}>
                  {index + 1}
                </div>
                {index < 3 && (
                  <div className={`
                    w-16 h-1 mx-2
                    ${index < ["welcome", "unsplash", "openai", "complete"].indexOf(currentStep)
                      ? "bg-white"
                      : "bg-white/30"
                    }
                  `} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: "calc(90vh - 200px)" }}>
          {currentStep === "welcome" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Key className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Welcome to Describe It!</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Let's set up your API keys to unlock all features
                </p>
              </div>

              <div className="grid gap-4">
                <div className="flex items-start gap-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <Image className="w-8 h-8 text-purple-600 dark:text-purple-400 mt-1" />
                  <div>
                    <h4 className="font-semibold mb-1">Image Search</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Search millions of high-quality images with Unsplash API
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <Brain className="w-8 h-8 text-green-600 dark:text-green-400 mt-1" />
                  <div>
                    <h4 className="font-semibold mb-1">AI Descriptions</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Generate intelligent descriptions with OpenAI's GPT models
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400 mt-1" />
                  <div>
                    <h4 className="font-semibold mb-1">Your Privacy</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Your API keys are stored locally and never sent to our servers
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === "unsplash" && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Image className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Unsplash API Key</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Enable image search with your free Unsplash API key
                </p>
              </div>

              <ApiKeyInput
                label="Unsplash Access Key"
                value={keys.unsplash}
                onChange={(value) => setKeys(prev => ({ ...prev, unsplash: value }))}
                onValidate={validateUnsplash}
                placeholder="Enter your Unsplash Access Key"
                helperText="Free tier includes 50 requests per hour"
                apiKeyUrl="https://unsplash.com/developers"
                apiKeyUrlText="Get Free API Key"
                isValid={validation.unsplash}
                serviceName="unsplash"
              />

              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <h4 className="font-semibold mb-2 flex items-center">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  How to get your Unsplash API Key:
                </h4>
                <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>1. Go to <a href="https://unsplash.com/developers" target="_blank" rel="noopener" className="text-blue-600 hover:underline">Unsplash Developers</a></li>
                  <li>2. Click "New Application"</li>
                  <li>3. Accept the terms and guidelines</li>
                  <li>4. Enter your application name and description</li>
                  <li>5. Copy your Access Key and paste it above</li>
                </ol>
              </div>
            </div>
          )}

          {currentStep === "openai" && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Brain className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">OpenAI API Key</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Enable AI-powered descriptions and translations
                </p>
              </div>

              <ApiKeyInput
                label="OpenAI API Key"
                value={keys.openai}
                onChange={(value) => setKeys(prev => ({ ...prev, openai: value }))}
                onValidate={validateOpenAI}
                placeholder="sk-..."
                helperText="Pay-as-you-go pricing, typically $0.002 per description"
                apiKeyUrl="https://platform.openai.com/api-keys"
                apiKeyUrlText="Get API Key"
                isValid={validation.openai}
                serviceName="openai"
              />

              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <h4 className="font-semibold mb-2 flex items-center">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  How to get your OpenAI API Key:
                </h4>
                <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>1. Go to <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener" className="text-blue-600 hover:underline">OpenAI Platform</a></li>
                  <li>2. Sign in or create an account</li>
                  <li>3. Click "Create new secret key"</li>
                  <li>4. Name your key (optional)</li>
                  <li>5. Copy the key immediately (it won't be shown again)</li>
                </ol>
              </div>
            </div>
          )}

          {currentStep === "complete" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Setup Complete!</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Your API keys are configured and ready to use
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <div className="flex items-center">
                    <Image className="w-5 h-5 mr-3 text-purple-600" />
                    <span className="font-medium">Unsplash API</span>
                  </div>
                  {validation.unsplash ? (
                    <span className="flex items-center text-green-600 dark:text-green-400">
                      <Check className="w-4 h-4 mr-1" />
                      Configured
                    </span>
                  ) : keys.unsplash ? (
                    <span className="text-yellow-600 dark:text-yellow-400">Key Added</span>
                  ) : (
                    <span className="text-gray-400">Not Set</span>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <div className="flex items-center">
                    <Brain className="w-5 h-5 mr-3 text-green-600" />
                    <span className="font-medium">OpenAI API</span>
                  </div>
                  {validation.openai ? (
                    <span className="flex items-center text-green-600 dark:text-green-400">
                      <Check className="w-4 h-4 mr-1" />
                      Configured
                    </span>
                  ) : keys.openai ? (
                    <span className="text-yellow-600 dark:text-yellow-400">Key Added</span>
                  ) : (
                    <span className="text-gray-400">Not Set</span>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  What's Next?
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Search for images using the search tab</li>
                  <li>• Select an image to generate AI descriptions</li>
                  <li>• Practice vocabulary with interactive exercises</li>
                  <li>• Customize your learning experience in settings</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <div>
            {currentStep !== "welcome" && currentStep !== "complete" && (
              <button
                onClick={handleSkip}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Skip for now
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {currentStep !== "welcome" && currentStep !== "complete" && (
              <button
                onClick={handlePrevious}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </button>
            )}
            
            {currentStep === "complete" ? (
              <button
                onClick={handleSaveAndComplete}
                disabled={saving}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all flex items-center"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Start Using App
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center"
              >
                {currentStep === "welcome" ? "Get Started" : "Next"}
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}