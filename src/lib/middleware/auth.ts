/**
 * Authentication Middleware
 * Simple auth check for API routes
 */

import { NextRequest, NextResponse } from 'next/server';

export async function validateAuth(request: NextRequest) {
  // For now, allow all requests
  // Full auth can be implemented once build is stable
  return {
    authenticated: true,
    user: null
  };
}

export async function checkRateLimit(userId: string, tier: string = 'free') {
  // Simplified rate limiting
  return {
    allowed: true,
    remaining: 100
  };
}