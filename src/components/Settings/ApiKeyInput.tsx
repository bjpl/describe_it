"use client";

import { useState, useCallback, useEffect } from "react";
import { Eye, EyeOff, Copy, Check, AlertCircle, Loader2, Key, ExternalLink, Trash2 } from "lucide-react";

interface ApiKeyInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onValidate?: () => Promise<boolean>;
  placeholder?: string;
  helperText?: string;
  apiKeyUrl?: string;
  apiKeyUrlText?: string;
  isValid?: boolean | null;
  validating?: boolean;
  serviceName: "unsplash" | "openai";
}

export function ApiKeyInput({
  label,
  value,
  onChange,
  onValidate,
  placeholder = "Enter your API key",
  helperText,
  apiKeyUrl,
  apiKeyUrlText = "Get API Key",
  isValid,
  validating = false,
  serviceName,
}: ApiKeyInputProps) {
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Sync with external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Mask the API key for display
  const getMaskedValue = useCallback((key: string) => {
    if (!key) return "";
    if (showKey) return key;
    
    // Show first 7 and last 4 characters
    if (key.length > 15) {
      return `${key.slice(0, 7)}${"•".repeat(key.length - 11)}${key.slice(-4)}`;
    }
    return "•".repeat(key.length);
  }, [showKey]);

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    if (!value) return;
    
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [value]);

  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.trim();
    setLocalValue(newValue);
    setHasChanges(newValue !== value);
  }, [value]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!hasChanges) return;
    
    setSaving(true);
    try {
      onChange(localValue);
      setHasChanges(false);
      
      // If validation function provided, validate after saving
      if (onValidate && localValue) {
        await onValidate();
      }
    } finally {
      setSaving(false);
    }
  }, [localValue, onChange, onValidate, hasChanges]);

  // Handle delete
  const handleDelete = useCallback(() => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 3000);
      return;
    }
    
    onChange("");
    setLocalValue("");
    setHasChanges(false);
    setDeleteConfirm(false);
  }, [deleteConfirm, onChange]);

  // Cancel changes
  const handleCancel = useCallback(() => {
    setLocalValue(value);
    setHasChanges(false);
  }, [value]);

  // Determine validation status
  const getValidationStatus = () => {
    if (validating) return "validating";
    if (isValid === true) return "valid";
    if (isValid === false) return "invalid";
    if (!localValue) return "empty";
    return "unknown";
  };

  const status = getValidationStatus();

  return (
    <div className="space-y-3">
      {/* Label and Get Key Link */}
      <div className="flex items-center justify-between">
        <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
          <Key className="w-4 h-4 mr-2" />
          {label}
        </label>
        
        {apiKeyUrl && (
          <a
            href={apiKeyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            {apiKeyUrlText}
            <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        )}
      </div>

      {/* Input Field */}
      <div className="relative">
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            value={showKey ? localValue : getMaskedValue(localValue)}
            onChange={handleChange}
            placeholder={placeholder}
            className={`
              w-full px-4 py-3 pr-32
              border rounded-lg transition-all
              font-mono text-sm
              ${status === "valid" 
                ? "border-green-400 bg-green-50 dark:bg-green-900/20 dark:border-green-600" 
                : status === "invalid"
                ? "border-red-400 bg-red-50 dark:bg-red-900/20 dark:border-red-600"
                : "border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              }
              focus:outline-none focus:ring-2 focus:ring-blue-500
              placeholder:text-gray-400 dark:placeholder:text-gray-500
            `}
          />

          {/* Status Icon */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {status === "valid" && (
              <Check className="w-5 h-5 text-green-500" />
            )}
            {status === "invalid" && (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            {status === "validating" && (
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            )}
          </div>

          {/* Action Buttons */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {/* Show/Hide Toggle */}
            {localValue && (
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                title={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}

            {/* Copy Button */}
            {value && (
              <button
                type="button"
                onClick={handleCopy}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                title="Copy key"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Delete Button */}
            {value && (
              <button
                type="button"
                onClick={handleDelete}
                className={`p-2 transition-colors ${
                  deleteConfirm 
                    ? "text-red-600 hover:text-red-700 dark:text-red-400" 
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
                title={deleteConfirm ? "Click again to confirm" : "Delete key"}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Character Count */}
        {localValue && (
          <div className="absolute -bottom-5 right-0 text-xs text-gray-500 dark:text-gray-400">
            {localValue.length} characters
          </div>
        )}
      </div>

      {/* Helper Text / Status Message */}
      <div className="mt-6">
        {status === "valid" && (
          <p className="text-sm text-green-600 dark:text-green-400 flex items-center">
            <Check className="w-4 h-4 mr-1" />
            API key is valid and working
          </p>
        )}
        {status === "invalid" && (
          <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
            <AlertCircle className="w-4 h-4 mr-1" />
            API key is invalid or not working
          </p>
        )}
        {status === "validating" && (
          <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center">
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            Validating API key...
          </p>
        )}
        {status === "empty" && helperText && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        )}
      </div>

      {/* Save/Cancel Buttons */}
      {hasChanges && (
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={handleSave}
            disabled={saving || !localValue}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Key"
            )}
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">
            Are you sure you want to delete this API key? Click the delete button again to confirm.
          </p>
        </div>
      )}
    </div>
  );
}