import React from 'react';
import { create, StateCreator } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { createShallowSelector } from '../utils/storeUtils';

/**
 * Form State Management Store
 * Features:
 * - Multi-form state management
 * - Real-time validation
 * - Dirty state tracking
 * - Async submission handling
 * - Field-level error management
 * - Auto-save functionality
 * - Form history/undo
 */

// Generic validation rule with proper type constraints
export interface ValidationRule<T = unknown> {
  validate: (value: T) => boolean | string | Promise<boolean | string>;
  message: string;
  debounceMs?: number;
}

// Generic field configuration with proper type safety
export interface FieldConfig<T = unknown> {
  name: string;
  defaultValue: T;
  validationRules?: ValidationRule<T>[];
  required?: boolean;
  sanitizer?: (value: T) => T;
  formatter?: (value: T) => string;
}

// Field state with generic value type
export interface FieldState<T = unknown> {
  value: T;
  error: string | null;
  isValidating: boolean;
  isDirty: boolean;
  isTouched: boolean;
  isValid: boolean;
  hasAsyncValidation: boolean;
}

export interface FormState {
  id: string;
  fields: Record<string, FieldState>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
  submitCount: number;
  lastSubmitTime?: Date;
  errors: string[];
  config: Record<string, FieldConfig>;
  autoSave: boolean;
  history: FormSnapshot[];
  historyIndex: number;
}

interface FormSnapshot {
  timestamp: Date;
  fields: Record<string, any>;
  action: 'manual' | 'auto' | 'submit' | 'reset';
}

// Form store state
interface FormStoreState {
  forms: Record<string, FormState>;
  activeFormId: string | null;
  globalErrors: string[];
}

// Form store actions with proper type signatures
interface FormStoreActions {
  // Form management
  createForm: (
    id: string,
    config: Record<string, FieldConfig<unknown>>,
    options?: { autoSave?: boolean }
  ) => void;
  destroyForm: (id: string) => void;
  setActiveForm: (id: string) => void;
  resetForm: (id: string) => void;
  
  // Field operations
  setFieldValue: (formId: string, fieldName: string, value: unknown) => void;
  setFieldError: (formId: string, fieldName: string, error: string | null) => void;
  setFieldTouched: (formId: string, fieldName: string, touched?: boolean) => void;
  validateField: (formId: string, fieldName: string) => Promise<boolean>;
  validateForm: (formId: string) => Promise<boolean>;

  // Form submission with proper generic typing
  submitForm: <TData = Record<string, unknown>, TResult = unknown>(
    formId: string,
    submitFn: (data: TData) => Promise<TResult>
  ) => Promise<TResult>;
  setSubmitting: (formId: string, submitting: boolean) => void;

  // Utility
  getFormData: (formId: string) => Record<string, unknown> | null;
  getFormErrors: (formId: string) => Record<string, string>;
  isFormValid: (formId: string) => boolean;
  isFormDirty: (formId: string) => boolean;

  // History/Undo
  saveSnapshot: (formId: string, action: FormSnapshot['action']) => void;
  undo: (formId: string) => void;
  redo: (formId: string) => void;
  canUndo: (formId: string) => boolean;
  canRedo: (formId: string) => boolean;

  // Auto-save
  enableAutoSave: (formId: string, intervalMs?: number) => void;
  disableAutoSave: (formId: string) => void;
}

// Complete store type
type FormStoreType = FormStoreState & FormStoreActions;

// Validation utilities
const validateRequired = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const runValidation = async (value: any, rules: ValidationRule[]): Promise<string | null> => {
  for (const rule of rules) {
    try {
      const result = await rule.validate(value);
      if (result !== true) {
        return typeof result === 'string' ? result : rule.message;
      }
    } catch (error) {
      return `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
  return null;
};

// Type-safe store creator
type FormStoreCreator = StateCreator<
  FormStoreType,
  [["zustand/devtools", never], ["zustand/subscribeWithSelector", never]],
  [],
  FormStoreType
>;

export const useFormStore = create<FormStoreType>()(
  devtools(
    subscribeWithSelector(
      ((set, get) => ({
        forms: {},
        activeFormId: null,
        globalErrors: [],
        
        createForm: (id, config, options = {}) => {
          const fields: Record<string, FieldState> = {};
          
          Object.entries(config).forEach(([name, fieldConfig]) => {
            fields[name] = {
              value: fieldConfig.defaultValue,
              error: null,
              isValidating: false,
              isDirty: false,
              isTouched: false,
              isValid: !fieldConfig.required || validateRequired(fieldConfig.defaultValue),
              hasAsyncValidation: fieldConfig.validationRules?.some(rule => 
                rule.validate.constructor.name === 'AsyncFunction'
              ) || false
            };
          });
          
          const newForm: FormState = {
            id,
            fields,
            isSubmitting: false,
            isValid: Object.values(fields).every(field => field.isValid),
            isDirty: false,
            submitCount: 0,
            errors: [],
            config,
            autoSave: options.autoSave || false,
            history: [],
            historyIndex: -1
          };
          
          set((state) => ({
            forms: { ...state.forms, [id]: newForm },
            activeFormId: state.activeFormId || id
          }), false, 'createForm');
          
          // Save initial snapshot
          get().saveSnapshot(id, 'manual');
        },
        
        destroyForm: (id) => {
          set((state) => {
            const { [id]: removed, ...remainingForms } = state.forms;
            return {
              forms: remainingForms,
              activeFormId: state.activeFormId === id ? null : state.activeFormId
            };
          }, false, 'destroyForm');
        },
        
        setActiveForm: (id) => {
          set({ activeFormId: id }, false, 'setActiveForm');
        },
        
        resetForm: (id) => {
          const form = get().forms[id];
          if (!form) return;
          
          const fields: Record<string, FieldState> = {};
          Object.entries(form.config).forEach(([name, fieldConfig]) => {
            fields[name] = {
              value: fieldConfig.defaultValue,
              error: null,
              isValidating: false,
              isDirty: false,
              isTouched: false,
              isValid: !fieldConfig.required || validateRequired(fieldConfig.defaultValue),
              hasAsyncValidation: fieldConfig.validationRules?.some(rule => 
                rule.validate.constructor.name === 'AsyncFunction'
              ) || false
            };
          });
          
          set((state) => ({
            forms: {
              ...state.forms,
              [id]: {
                ...form,
                fields,
                isValid: Object.values(fields).every(field => field.isValid),
                isDirty: false,
                errors: []
              }
            }
          }), false, 'resetForm');
          
          get().saveSnapshot(id, 'reset');
        },
        
        setFieldValue: (formId, fieldName, value) => {
          const form = get().forms[formId];
          if (!form) return;
          
          const fieldConfig = form.config[fieldName];
          const sanitizedValue = fieldConfig?.sanitizer ? fieldConfig.sanitizer(value) : value;
          
          set((state) => {
            const currentField = state.forms[formId].fields[fieldName];
            const updatedField: FieldState = {
              ...currentField,
              value: sanitizedValue,
              isDirty: sanitizedValue !== fieldConfig?.defaultValue,
              isTouched: true
            };
            
            const updatedFields = {
              ...state.forms[formId].fields,
              [fieldName]: updatedField
            };
            
            const isFormDirty = Object.values(updatedFields).some(field => field.isDirty);
            const isFormValid = Object.values(updatedFields).every(field => field.isValid && !field.error);
            
            return {
              forms: {
                ...state.forms,
                [formId]: {
                  ...state.forms[formId],
                  fields: updatedFields,
                  isDirty: isFormDirty,
                  isValid: isFormValid
                }
              }
            };
          }, false, 'setFieldValue');
          
          // Validate the field after setting value
          get().validateField(formId, fieldName);
        },
        
        setFieldError: (formId, fieldName, error) => {
          set((state) => {
            const form = state.forms[formId];
            if (!form) return state;
            
            const updatedField = {
              ...form.fields[fieldName],
              error,
              isValid: !error
            };
            
            const updatedFields = {
              ...form.fields,
              [fieldName]: updatedField
            };
            
            const isFormValid = Object.values(updatedFields).every(field => field.isValid && !field.error);
            
            return {
              forms: {
                ...state.forms,
                [formId]: {
                  ...form,
                  fields: updatedFields,
                  isValid: isFormValid
                }
              }
            };
          }, false, 'setFieldError');
        },
        
        setFieldTouched: (formId, fieldName, touched = true) => {
          set((state) => {
            const form = state.forms[formId];
            if (!form) return state;
            
            return {
              forms: {
                ...state.forms,
                [formId]: {
                  ...form,
                  fields: {
                    ...form.fields,
                    [fieldName]: {
                      ...form.fields[fieldName],
                      isTouched: touched
                    }
                  }
                }
              }
            };
          }, false, 'setFieldTouched');
        },
        
        validateField: async (formId, fieldName) => {
          const form = get().forms[formId];
          if (!form) return false;
          
          const field = form.fields[fieldName];
          const fieldConfig = form.config[fieldName];
          
          if (!fieldConfig) return false;
          
          // Set validating state
          set((state) => ({
            forms: {
              ...state.forms,
              [formId]: {
                ...state.forms[formId],
                fields: {
                  ...state.forms[formId].fields,
                  [fieldName]: {
                    ...state.forms[formId].fields[fieldName],
                    isValidating: true
                  }
                }
              }
            }
          }), false, 'validateField:start');
          
          let error: string | null = null;
          
          // Required validation
          if (fieldConfig.required && !validateRequired(field.value)) {
            error = `${fieldName} is required`;
          }
          
          // Custom validations
          if (!error && fieldConfig.validationRules) {
            error = await runValidation(field.value, fieldConfig.validationRules);
          }
          
          // Update field with validation result
          set((state) => {
            const updatedField = {
              ...state.forms[formId].fields[fieldName],
              error,
              isValid: !error,
              isValidating: false
            };
            
            const updatedFields = {
              ...state.forms[formId].fields,
              [fieldName]: updatedField
            };
            
            const isFormValid = Object.values(updatedFields).every(field => field.isValid && !field.error);
            
            return {
              forms: {
                ...state.forms,
                [formId]: {
                  ...state.forms[formId],
                  fields: updatedFields,
                  isValid: isFormValid
                }
              }
            };
          }, false, 'validateField:complete');
          
          return !error;
        },
        
        validateForm: async (formId) => {
          const form = get().forms[formId];
          if (!form) return false;
          
          const validationResults = await Promise.all(
            Object.keys(form.fields).map(fieldName => get().validateField(formId, fieldName))
          );
          
          return validationResults.every(result => result);
        },
        
        submitForm: async (formId, submitFn) => {
          const form = get().forms[formId];
          if (!form) throw new Error('Form not found');
          
          set((state) => ({
            forms: {
              ...state.forms,
              [formId]: {
                ...state.forms[formId],
                isSubmitting: true,
                errors: []
              }
            }
          }), false, 'submitForm:start');
          
          try {
            // Validate form before submission
            const isValid = await get().validateForm(formId);
            if (!isValid) {
              throw new Error('Form validation failed');
            }
            
            const formData = get().getFormData(formId);
            if (!formData) throw new Error('Unable to get form data');
            
            const result = await submitFn(formData);
            
            set((state) => ({
              forms: {
                ...state.forms,
                [formId]: {
                  ...state.forms[formId],
                  isSubmitting: false,
                  submitCount: state.forms[formId].submitCount + 1,
                  lastSubmitTime: new Date()
                }
              }
            }), false, 'submitForm:success');
            
            get().saveSnapshot(formId, 'submit');
            
            return result;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Submission failed';
            
            set((state) => ({
              forms: {
                ...state.forms,
                [formId]: {
                  ...state.forms[formId],
                  isSubmitting: false,
                  errors: [errorMessage]
                }
              }
            }), false, 'submitForm:error');
            
            throw error;
          }
        },
        
        setSubmitting: (formId, submitting) => {
          set((state) => ({
            forms: {
              ...state.forms,
              [formId]: {
                ...state.forms[formId],
                isSubmitting: submitting
              }
            }
          }), false, 'setSubmitting');
        },
        
        getFormData: (formId) => {
          const form = get().forms[formId];
          if (!form) return null;
          
          const data: Record<string, any> = {};
          Object.entries(form.fields).forEach(([name, field]) => {
            const fieldConfig = form.config[name];
            data[name] = fieldConfig?.formatter ? fieldConfig.formatter(field.value) : field.value;
          });
          
          return data;
        },
        
        getFormErrors: (formId) => {
          const form = get().forms[formId];
          if (!form) return {};
          
          const errors: Record<string, string> = {};
          Object.entries(form.fields).forEach(([name, field]) => {
            if (field.error) {
              errors[name] = field.error;
            }
          });
          
          return errors;
        },
        
        isFormValid: (formId) => {
          const form = get().forms[formId];
          return form?.isValid || false;
        },
        
        isFormDirty: (formId) => {
          const form = get().forms[formId];
          return form?.isDirty || false;
        },
        
        saveSnapshot: (formId, action) => {
          const formData = get().getFormData(formId);
          if (!formData) return;
          
          set((state) => {
            const form = state.forms[formId];
            if (!form) return state;
            
            const snapshot: FormSnapshot = {
              timestamp: new Date(),
              fields: formData,
              action
            };
            
            // Remove any snapshots after current index (when undoing and making new changes)
            const newHistory = form.history.slice(0, form.historyIndex + 1);
            newHistory.push(snapshot);
            
            // Limit history size to 50 snapshots
            const limitedHistory = newHistory.slice(-50);
            
            return {
              forms: {
                ...state.forms,
                [formId]: {
                  ...form,
                  history: limitedHistory,
                  historyIndex: limitedHistory.length - 1
                }
              }
            };
          }, false, 'saveSnapshot');
        },
        
        undo: (formId) => {
          const form = get().forms[formId];
          if (!form || !get().canUndo(formId)) return;
          
          const previousIndex = form.historyIndex - 1;
          const snapshot = form.history[previousIndex];
          
          if (snapshot) {
            // Restore form data from snapshot
            Object.entries(snapshot.fields).forEach(([fieldName, value]) => {
              get().setFieldValue(formId, fieldName, value);
            });
            
            set((state) => ({
              forms: {
                ...state.forms,
                [formId]: {
                  ...state.forms[formId],
                  historyIndex: previousIndex
                }
              }
            }), false, 'undo');
          }
        },
        
        redo: (formId) => {
          const form = get().forms[formId];
          if (!form || !get().canRedo(formId)) return;
          
          const nextIndex = form.historyIndex + 1;
          const snapshot = form.history[nextIndex];
          
          if (snapshot) {
            // Restore form data from snapshot
            Object.entries(snapshot.fields).forEach(([fieldName, value]) => {
              get().setFieldValue(formId, fieldName, value);
            });
            
            set((state) => ({
              forms: {
                ...state.forms,
                [formId]: {
                  ...state.forms[formId],
                  historyIndex: nextIndex
                }
              }
            }), false, 'redo');
          }
        },
        
        canUndo: (formId) => {
          const form = get().forms[formId];
          return form ? form.historyIndex > 0 : false;
        },
        
        canRedo: (formId) => {
          const form = get().forms[formId];
          return form ? form.historyIndex < form.history.length - 1 : false;
        },
        
        enableAutoSave: (formId, intervalMs = 30000) => {
          if (typeof window === 'undefined') return;
          
          // Clear existing auto-save interval
          get().disableAutoSave(formId);
          
          const intervalId = setInterval(() => {
            const form = get().forms[formId];
            if (form && form.isDirty) {
              get().saveSnapshot(formId, 'auto');
            }
          }, intervalMs);
          
          set((state) => ({
            forms: {
              ...state.forms,
              [formId]: {
                ...state.forms[formId],
                autoSave: true,
                autoSaveInterval: intervalId
              }
            }
          }), false, 'enableAutoSave');
        },
        
        disableAutoSave: (formId) => {
          if (typeof window === 'undefined') return;

          const form = get().forms[formId];
          if (form && (form as FormState & { autoSaveInterval?: NodeJS.Timeout }).autoSaveInterval) {
            clearInterval((form as FormState & { autoSaveInterval?: NodeJS.Timeout }).autoSaveInterval);
          }

          set((state) => ({
            forms: {
              ...state.forms,
              [formId]: {
                ...state.forms[formId],
                autoSave: false,
                autoSaveInterval: undefined
              }
            }
          }), false, 'disableAutoSave');
        }
      })) as FormStoreCreator
    ),
    { name: 'FormStore' }
  )
);

// Optimized selectors
const formSelector = (formId: string) => createShallowSelector((state: FormStoreType) => state.forms[formId]);

const fieldSelector = (formId: string, fieldName: string) =>
  createShallowSelector((state: FormStoreType) => state.forms[formId]?.fields[fieldName]);

// Hooks with proper typing
export const useForm = (formId: string): FormState | undefined => {
  return useFormStore(formSelector(formId));
};

export const useField = <T = unknown>(formId: string, fieldName: string): FieldState<T> | undefined => {
  return useFormStore(fieldSelector(formId, fieldName)) as FieldState<T> | undefined;
};

export const useFormActions = (): FormStoreActions => useFormStore((state) => ({
  createForm: state.createForm,
  destroyForm: state.destroyForm,
  setActiveForm: state.setActiveForm,
  resetForm: state.resetForm,
  setFieldValue: state.setFieldValue,
  setFieldError: state.setFieldError,
  setFieldTouched: state.setFieldTouched,
  validateField: state.validateField,
  validateForm: state.validateForm,
  submitForm: state.submitForm,
  undo: state.undo,
  redo: state.redo,
  enableAutoSave: state.enableAutoSave,
  disableAutoSave: state.disableAutoSave
}));

// Validation rules library
export const validationRules = {
  required: (): ValidationRule => ({
    validate: (value) => validateRequired(value),
    message: 'This field is required'
  }),
  
  minLength: (min: number): ValidationRule<string> => ({
    validate: (value) => typeof value === 'string' && value.length >= min,
    message: `Must be at least ${min} characters`
  }),
  
  maxLength: (max: number): ValidationRule<string> => ({
    validate: (value) => typeof value === 'string' && value.length <= max,
    message: `Must be no more than ${max} characters`
  }),
  
  email: (): ValidationRule<string> => ({
    validate: (value) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: 'Must be a valid email address'
  }),
  
  url: (): ValidationRule<string> => ({
    validate: (value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message: 'Must be a valid URL'
  }),
  
  pattern: (regex: RegExp, message: string): ValidationRule<string> => ({
    validate: (value) => typeof value === 'string' && regex.test(value),
    message
  }),
  
  apiKey: (provider: 'openai' | 'unsplash'): ValidationRule<string> => ({
    validate: async (value) => {
      if (typeof value !== 'string') return false;
      
      const patterns = {
        openai: /^sk-[A-Za-z0-9]{48}$/,
        unsplash: /^[A-Za-z0-9_-]{43}$/
      };
      
      return patterns[provider].test(value);
    },
    message: `Must be a valid ${provider} API key`
  })
};