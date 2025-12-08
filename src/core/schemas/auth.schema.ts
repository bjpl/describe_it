/**
 * Authentication API Schemas
 *
 * Zod schemas for authentication endpoints with runtime validation
 * and TypeScript type inference
 */

import { z } from 'zod';

// ============================================================================
// SIGN IN
// ============================================================================

export const signinRequestSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(255),
  rememberMe: z.boolean().optional().default(false),
});

export type SigninRequest = z.infer<typeof signinRequestSchema>;

export const signinResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  isMock: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    emailConfirmed: z.boolean(),
    lastSignIn: z.string().datetime().nullable(),
  }).nullable(),
  session: z.object({
    access_token: z.string(),
    refresh_token: z.string(),
    expires_at: z.number(),
  }).nullable().optional(),
});

export type SigninResponse = z.infer<typeof signinResponseSchema>;

// ============================================================================
// SIGN UP
// ============================================================================

export const signupRequestSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(255)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: z.string(),
  name: z.string().min(1, 'Name is required').max(255).optional(),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions',
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type SignupRequest = z.infer<typeof signupRequestSchema>;

export const signupResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    emailConfirmed: z.boolean(),
    createdAt: z.string().datetime(),
  }).nullable(),
  requiresEmailConfirmation: z.boolean().optional(),
});

export type SignupResponse = z.infer<typeof signupResponseSchema>;

// ============================================================================
// PASSWORD RESET
// ============================================================================

export const resetPasswordRequestSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
});

export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;

export const resetPasswordResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  resetEmailSent: z.boolean(),
});

export type ResetPasswordResponse = z.infer<typeof resetPasswordResponseSchema>;

// ============================================================================
// UPDATE PASSWORD
// ============================================================================

export const updatePasswordRequestSchema = z.object({
  currentPassword: z.string().min(8).max(255),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(255)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmNewPassword: z.string(),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: 'Passwords do not match',
  path: ['confirmNewPassword'],
}).refine(data => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword'],
});

export type UpdatePasswordRequest = z.infer<typeof updatePasswordRequestSchema>;

export const updatePasswordResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type UpdatePasswordResponse = z.infer<typeof updatePasswordResponseSchema>;

// ============================================================================
// SESSION VALIDATION
// ============================================================================

export const validateSessionRequestSchema = z.object({
  accessToken: z.string().min(1),
});

export type ValidateSessionRequest = z.infer<typeof validateSessionRequestSchema>;

export const validateSessionResponseSchema = z.object({
  success: z.boolean(),
  valid: z.boolean(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    role: z.enum(['user', 'admin', 'moderator']).optional(),
  }).nullable(),
  expiresAt: z.number().nullable(),
});

export type ValidateSessionResponse = z.infer<typeof validateSessionResponseSchema>;
