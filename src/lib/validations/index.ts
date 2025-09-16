// Main validation schemas export
export * from "./schemas";

// Individual schema modules
export * from "./auth";
export * from "./vocabulary";
export * from "./sessions";
export * from "./progress";

// Validation utilities
export { z } from "zod";

// Common validation patterns
export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const phonePattern = /^\+?[\d\s\-\(\)]+$/;
export const urlPattern = /^https?:\/\/.+/;

// Error messages
export const VALIDATION_ERRORS = {
  REQUIRED: "This field is required",
  EMAIL: "Please enter a valid email address",
  PASSWORD_MIN: "Password must be at least 6 characters",
  PASSWORD_MATCH: "Passwords don't match",
  PHONE: "Please enter a valid phone number",
  URL: "Please enter a valid URL",
  UUID: "Invalid ID format",
  DATE: "Please enter a valid date",
  NUMBER_MIN: "Value must be greater than minimum",
  NUMBER_MAX: "Value must be less than maximum",
  STRING_MIN: "Must be at least {min} characters",
  STRING_MAX: "Must be no more than {max} characters",
} as const;
