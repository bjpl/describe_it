/**
 * Form handling types
 */

import type { ValidationRules } from './props';

/**
 * Form handling types
 */
export interface FormData {
  [key: string]: FormFieldValue;
}

export type FormFieldValue =
  | string
  | number
  | boolean
  | Date
  | File
  | File[]
  | null
  | undefined;

export interface FormField {
  name: string;
  label: string;
  type: FormFieldType;
  value: FormFieldValue;
  validation: ValidationRules;
  options?: FormFieldOption[];
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
}

export type FormFieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'tel'
  | 'url'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'radio'
  | 'date'
  | 'datetime'
  | 'time'
  | 'file'
  | 'image'
  | 'hidden';

export interface FormFieldOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  group?: string;
}

export interface FormState {
  data: FormData;
  errors: FormErrors;
  touched: FormTouched;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
  submitCount: number;
}

export interface FormErrors {
  [fieldName: string]: string[] | undefined;
}

export interface FormTouched {
  [fieldName: string]: boolean | undefined;
}
