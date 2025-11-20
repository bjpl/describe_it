/**
 * React component prop types
 */

import type { JsonValue } from '../core/json-types';
import type { EventHandler } from '../core/utility-types';
import React from 'react';

/**
 * React component prop types
 */
export interface BaseComponentProps {
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  testId?: string;
  ariaLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
}

export interface InteractiveComponentProps extends BaseComponentProps {
  onClick?: EventHandler<React.MouseEvent>;
  onFocus?: EventHandler<React.FocusEvent>;
  onBlur?: EventHandler<React.FocusEvent>;
  onKeyDown?: EventHandler<React.KeyboardEvent>;
  onKeyUp?: EventHandler<React.KeyboardEvent>;
  tabIndex?: number;
}

export interface FormComponentProps extends InteractiveComponentProps {
  name?: string;
  value?: JsonValue;
  defaultValue?: JsonValue;
  onChange?: (value: JsonValue, name?: string) => void;
  onValidate?: (value: JsonValue) => ValidationResult;
  required?: boolean;
  readonly?: boolean;
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  validation?: ValidationRules;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: JsonValue) => ValidationResult;
}

/**
 * Event handler types for components
 */
export interface ComponentEventHandlers {
  onMount?: () => void;
  onUnmount?: () => void;
  onUpdate?: (prevProps: Record<string, unknown>, prevState: Record<string, unknown>) => void;
  onError?: (error: Error) => void;
  onResize?: (dimensions: ComponentDimensions) => void;
  onVisibilityChange?: (isVisible: boolean) => void;
}

export interface ComponentDimensions {
  width: number;
  height: number;
  top: number;
  left: number;
  bottom: number;
  right: number;
}
