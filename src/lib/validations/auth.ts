import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  preferred_language: z.enum(['en', 'es']).default('en'),
  learning_level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).default('beginner'),
  timezone: z.string().default('UTC'),
});

export const updateProfileSchema = z.object({
  full_name: z.string().min(2).optional(),
  username: z.string().min(3).max(30).optional(),
  avatar_url: z.string().url().optional(),
  preferred_language: z.enum(['en', 'es']).optional(),
  learning_level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
  daily_goal: z.number().min(1).max(1000).optional(),
  timezone: z.string().optional(),
  notification_settings: z.record(z.boolean()).optional(),
  preferences: z.record(z.any()).optional(),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(6),
  new_password: z.string().min(6),
  confirm_password: z.string().min(6),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  new_password: z.string().min(6, 'Password must be at least 6 characters'),
  confirm_password: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
export type UpdateProfileRequest = z.infer<typeof updateProfileSchema>;
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;