/**
 * E2E Test Configuration
 *
 * Test users, Supabase config, and other test constants
 */

export const TEST_USERS = {
  existingUser: {
    email: process.env.TEST_USER_EMAIL || 'test@example.com',
    password: process.env.TEST_USER_PASSWORD || 'testpassword123',
    fullName: 'Test User'
  },
  newUser: {
    email: `test-${Date.now()}@example.com`,
    password: 'newpassword123',
    fullName: 'New Test User'
  },
  adminUser: {
    email: process.env.ADMIN_USER_EMAIL || 'admin@example.com',
    password: process.env.ADMIN_USER_PASSWORD || 'adminpassword123',
    fullName: 'Admin User'
  }
};

export const SUPABASE_CONFIG = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  redirectUrl: process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL || 'http://localhost:3000/auth/callback'
};

export const TEST_TIMEOUTS = {
  short: 5000,
  medium: 10000,
  long: 30000,
  oauth: 60000
};

export const API_ENDPOINTS = {
  signin: '/api/auth/signin',
  signup: '/api/auth/signup',
  signout: '/api/auth/signout',
  callback: '/auth/callback',
  session: '/api/auth/session'
};

export const ROUTES = {
  home: '/',
  dashboard: '/dashboard',
  admin: '/admin',
  profile: '/profile'
};

export const SELECTORS = {
  authModal: '[class*="modal"]',
  loginButton: 'text=/sign in|login/i',
  signupButton: 'text=/sign up/i',
  logoutButton: 'text=/logout|sign out/i',
  userMenu: 'text=/profile|account/i',
  emailInput: 'input[type="email"]',
  passwordInput: 'input[type="password"]',
  submitButton: 'button[type="submit"]',
  errorMessage: '[class*="red"]',
  successMessage: '[class*="green"]',
  loadingSpinner: 'svg.animate-spin'
};

export const OAUTH_PROVIDERS = {
  google: 'google',
  github: 'github',
  discord: 'discord'
} as const;

export const ERROR_MESSAGES = {
  invalidCredentials: /invalid|incorrect|wrong/i,
  userNotFound: /not found|does not exist/i,
  emailExists: /already exists|registered|duplicate/i,
  weakPassword: /password|6 characters|requirements/i,
  networkError: /network|connection|failed/i,
  serverError: /server|error|500/i,
  timeout: /timeout|timed out/i,
  rateLimit: /too many|rate limit|try again/i
};

export const SUCCESS_MESSAGES = {
  loginSuccess: /successfully|welcome/i,
  signupSuccess: /check your email|verification/i,
  logoutSuccess: /logged out|goodbye/i,
  emailSent: /sent|check your email/i
};
