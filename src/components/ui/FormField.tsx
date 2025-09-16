"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle, Info } from "lucide-react";

export interface FormFieldProps {
  children: React.ReactNode;
  className?: string;
}

export function FormField({ children, className }: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {children}
    </div>
  );
}

export interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}

export function FormLabel({ children, required, className, ...props }: FormLabelProps) {
  return (
    <label
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="text-destructive ml-1">*</span>}
    </label>
  );
}

export interface FormDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function FormDescription({ children, className }: FormDescriptionProps) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {children}
    </p>
  );
}

export interface FormMessageProps {
  children?: React.ReactNode;
  type?: "error" | "success" | "warning" | "info";
  className?: string;
}

export function FormMessage({ children, type = "error", className }: FormMessageProps) {
  if (!children) return null;

  const typeStyles = {
    error: "text-destructive",
    success: "text-green-600 dark:text-green-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    info: "text-blue-600 dark:text-blue-400",
  };

  const typeIcons = {
    error: AlertCircle,
    success: CheckCircle,
    warning: AlertCircle,
    info: Info,
  };

  const Icon = typeIcons[type];

  return (
    <div className={cn("flex items-center gap-2 text-sm", typeStyles[type], className)}>
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span>{children}</span>
    </div>
  );
}

// Enhanced input with validation states
export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  success?: boolean;
  className?: string;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ className, error, success, type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive focus-visible:ring-destructive",
          success && "border-green-500 focus-visible:ring-green-500",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

FormInput.displayName = "FormInput";

// Enhanced textarea with validation states
export interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  success?: boolean;
  className?: string;
}

export const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ className, error, success, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive focus-visible:ring-destructive",
          success && "border-green-500 focus-visible:ring-green-500",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

FormTextarea.displayName = "FormTextarea";

// Form validation hook
export interface ValidationRule {
  required?: boolean | string;
  minLength?: { value: number; message: string };
  maxLength?: { value: number; message: string };
  pattern?: { value: RegExp; message: string };
  custom?: (value: any) => string | undefined;
}

export interface UseFormValidationProps {
  initialValues: Record<string, any>;
  rules?: Record<string, ValidationRule>;
}

export function useFormValidation({ initialValues, rules = {} }: UseFormValidationProps) {
  const [values, setValues] = React.useState(initialValues);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  const validate = React.useCallback(
    (fieldName?: string) => {
      const fieldsToValidate = fieldName ? [fieldName] : Object.keys(rules);
      const newErrors: Record<string, string> = { ...errors };

      fieldsToValidate.forEach((field) => {
        const value = values[field];
        const rule = rules[field];
        
        if (!rule) {
          delete newErrors[field];
          return;
        }

        // Required validation
        if (rule.required) {
          if (!value || (typeof value === "string" && value.trim() === "")) {
            newErrors[field] = typeof rule.required === "string" 
              ? rule.required 
              : `${field} is required`;
            return;
          }
        }

        // Skip other validations if field is empty and not required
        if (!value) {
          delete newErrors[field];
          return;
        }

        // MinLength validation
        if (rule.minLength && typeof value === "string" && value.length < rule.minLength.value) {
          newErrors[field] = rule.minLength.message;
          return;
        }

        // MaxLength validation
        if (rule.maxLength && typeof value === "string" && value.length > rule.maxLength.value) {
          newErrors[field] = rule.maxLength.message;
          return;
        }

        // Pattern validation
        if (rule.pattern && typeof value === "string" && !rule.pattern.value.test(value)) {
          newErrors[field] = rule.pattern.message;
          return;
        }

        // Custom validation
        if (rule.custom) {
          const customError = rule.custom(value);
          if (customError) {
            newErrors[field] = customError;
            return;
          }
        }

        // If we get here, the field is valid
        delete newErrors[field];
      });

      setErrors(newErrors);
      return newErrors;
    },
    [values, rules, errors]
  );

  const setValue = React.useCallback((field: string, value: any) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setFieldTouched = React.useCallback((field: string, isTouched = true) => {
    setTouched((prev) => ({ ...prev, [field]: isTouched }));
  }, []);

  const getFieldProps = React.useCallback(
    (field: string) => ({
      value: values[field] || "",
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setValue(field, e.target.value);
      },
      onBlur: () => {
        setFieldTouched(field);
        validate(field);
      },
      error: touched[field] && !!errors[field],
      success: touched[field] && !errors[field] && !!values[field],
    }),
    [values, touched, errors, setValue, setFieldTouched, validate]
  );

  const isValid = Object.keys(errors).length === 0;
  const isFormTouched = Object.keys(touched).length > 0;

  return {
    values,
    errors,
    touched,
    isValid,
    isFormTouched,
    setValue,
    setFieldTouched,
    validate,
    getFieldProps,
    reset: () => {
      setValues(initialValues);
      setErrors({});
      setTouched({});
    },
  };
}

export default FormField;
