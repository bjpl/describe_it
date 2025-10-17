# Authentication Testing & Troubleshooting Guide

## 🧪 Test Page
Visit: https://describe-it-lovat.vercel.app/test-auth

## Current Auth Implementation Status

### ✅ What's Already Implemented:
1. **Signup Endpoints** (3 versions):
   - `/api/auth/signup` - Full validation with schema
   - `/api/auth/simple-signup` - Minimal, direct Supabase call
   - `/api/auth/mock-signup` - Testing endpoint

2. **Signin Endpoints**:
   - `/api/auth/signin` - Full validation
   - OAuth providers: Google, GitHub, Discord

3. **UI Components**:
   - `AuthModal` - Complete signup/signin form
   - `UserMenu` - User dropdown with auth state
   - `AuthProvider` - React context for auth state

4. **Auth Manager**:
   - Session management
   - Token refresh
   - Profile management
   - API key storage

### ⚠️ Known Issues to Check:

1. **Email Confirmation**:
   - Supabase requires email confirmation by default
   - Check Supabase Dashboard → Authentication → Settings
   - Disable "Email Confirmations" for testing
   - Or use the confirmation emails

2. **CORS Issues**:
   - OAuth providers need proper redirect URLs
   - Check Supabase Dashboard → Authentication → URL Configuration
   - Add: `https://describe-it-lovat.vercel.app/auth/callback`

3. **Environment Variables**:
   - Verify Vercel has all Supabase env vars:
     - `NEXT_PUBLIC_SUPABASE_URL` ✅
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅
     - `SUPABASE_SERVICE_ROLE_KEY` ✅

## 🔧 Quick Fixes

### Fix 1: Disable Email Confirmation (For Testing)
1. Go to Supabase Dashboard
2. Authentication → Providers → Email
3. Uncheck "Enable email confirmations"
4. Save

### Fix 2: Add Redirect URLs
1. Supabase Dashboard → Authentication → URL Configuration
2. Add to "Site URL": `https://describe-it-lovat.vercel.app`
3. Add to "Redirect URLs":
   - `https://describe-it-lovat.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback` (for dev)

### Fix 3: Test Signup Flow
```bash
curl -X POST https://describe-it-lovat.vercel.app/api/auth/simple-signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

## 📋 Signup Flow Checklist

- [ ] Supabase email confirmation disabled OR emails working
- [ ] Redirect URLs configured in Supabase
- [ ] Environment variables set in Vercel
- [ ] Test page accessible at /test-auth
- [ ] Signup creates user in Supabase
- [ ] Signin returns valid session
- [ ] UI updates after authentication

## 🐛 Demo Mode Input Issue

### Possible Causes:
1. **Z-index conflict** - Modal overlaying input
2. **Focus stealing** - Component taking focus on mount
3. **Event handler** - Click/input being prevented
4. **CSS visibility** - Input rendered but not visible

### Debug Steps:
1. Open browser DevTools
2. Inspect the search input element
3. Check:
   - Is `disabled` attribute present?
   - Is `readonly` attribute present?
   - What's the `z-index` value?
   - Any overlaying elements?
4. Try typing and check if `value` attribute updates

### Quick Test:
```javascript
// Run in browser console on the live site:
document.querySelector('input[type="text"]').disabled = false;
document.querySelector('input[type="text"]').focus();
```

## 🔍 Further Investigation Needed

Please provide:
1. Screenshots of the demo mode input issue
2. Browser console errors when trying to type
3. Does clicking the input field show a cursor?
4. Does the signup modal appear when clicking Sign In?
