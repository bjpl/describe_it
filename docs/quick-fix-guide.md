# 🐛 Quick Fix Guide - Demo Mode & Auth

## Issue #1: Demo Mode Input Not Working

### **Problem:**
Search input doesn't respond to typing in demo mode, but demo images appear.

### **Root Cause Analysis:**

The input field code is correct:
```tsx
<input
  type="text"
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  // NO disabled or readOnly attributes
/>
```

### **Possible Causes:**

1. **Focus Hijacking** - Another component is stealing focus
2. **Event Propagation** - Click event being stopped
3. **Overlay Element** - Modal/popup covering input (check z-index)
4. **Browser Autofill** - Interfering with React state

### **Debug Steps:**

Open browser DevTools (F12) and run:
```javascript
// 1. Find the input
const input = document.querySelector('input[placeholder*="Search for images"]');
console.log('Input found:', !!input);
console.log('Disabled:', input?.disabled);
console.log('ReadOnly:', input?.readOnly);
console.log('Current value:', input?.value);

// 2. Check z-index and position
const computed = window.getComputedStyle(input);
console.log('Z-index:', computed.zIndex);
console.log('Pointer events:', computed.pointerEvents);
console.log('Visibility:', computed.visibility);
console.log('Display:', computed.display);

// 3. Check for overlapping elements
const rect = input.getBoundingClientRect();
const elementsAtPoint = document.elementsFromPoint(rect.x + rect.width/2, rect.y + rect.height/2);
console.log('Elements at input center:', elementsAtPoint.map(el => el.tagName + '.' + el.className));

// 4. Try to type programmatically
input.focus();
input.value = 'test search';
input.dispatchEvent(new Event('input', { bubbles: true }));
input.dispatchEvent(new Event('change', { bubbles: true }));
console.log('After manual update:', input.value);
```

### **Quick Fixes to Try:**

**Fix A: Force Input Focus**
```javascript
// Add to page load
setTimeout(() => {
  document.querySelector('input[type="text"]')?.focus();
}, 1000);
```

**Fix B: Check for Modal Overlay**
1. Look for any modal/popup when page loads
2. Press ESC key
3. Click outside any visible overlays
4. Try typing again

**Fix C: Disable Browser Autofill**
```tsx
<input
  type="text"
  autoComplete="off"
  data-lpignore="true"  // LastPass
  data-form-type="other"  // General
/>
```

### **Workaround:**
Use the suggestion buttons below the input:
- Click "nature", "people", "city", etc.
- These should trigger search even if typing doesn't work

---

## Issue #2: Signup Flow Not Working

### **Problem:**
Account creation returns "No API key found in request"

### **Solution:**
✅ **FIXED!** Updated auth callback to use direct Supabase client.

### **How to Test:**

**Option 1: Test Page (Recommended)**
1. Visit: https://describe-it-lovat.vercel.app/test-auth
2. Enter email & password
3. Click "Test Signup"
4. Check response

**Option 2: Main App**
1. Visit: https://describe-it-lovat.vercel.app
2. Click **User Icon** (top right)
3. Click **Sign In**
4. Switch to **Sign Up** tab
5. Fill form and submit

### **Supabase Configuration Required:**

**Go to:** https://supabase.com/dashboard/project/arjrpdccaczbybbrchvc

**1. Add Redirect URLs:**
- Authentication → URL Configuration
- Add these under "Redirect URLs":
  ```
  https://describe-it-lovat.vercel.app/auth/callback
  https://describe-it-lovat.vercel.app/*
  http://localhost:3000/auth/callback
  ```

**2. Disable Email Confirmation (For Testing):**
- Authentication → Providers → Email
- Uncheck "Enable email confirmations"
- Save

**3. Site URL:**
- Set to: `https://describe-it-lovat.vercel.app`

### **Expected Signup Flow:**

1. User fills signup form
2. POST to `/api/auth/simple-signup`
3. Supabase creates user account
4. If email confirmation disabled → User logged in immediately
5. If email confirmation enabled → Check email for link
6. Email link redirects to `/auth/callback?code=...`
7. Callback exchanges code for session
8. Redirects to `/?auth=success`
9. User is now logged in!

### **Test Signup via API:**

```bash
curl -X POST https://describe-it-lovat.vercel.app/api/auth/simple-signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Check your email to confirm your account",
  "user": { ... }
}
```

### **Troubleshooting:**

**If signup still fails:**
1. Check Vercel logs: `vercel logs https://describe-it-lovat.vercel.app`
2. Check browser console for errors
3. Verify environment variables in Vercel:
   ```bash
   vercel env ls | grep SUPABASE
   ```

**Common Issues:**
- ❌ Email already exists → Use different email
- ❌ Password too weak → Use 6+ characters
- ❌ Email confirmation required → Check email or disable in Supabase
- ❌ Redirect URL not allowed → Add to Supabase config

---

## 📋 Complete Setup Checklist

### Supabase Dashboard:
- [ ] Redirect URLs added (`/auth/callback`)
- [ ] Site URL set to production domain
- [ ] Email confirmation disabled (for testing)
- [ ] Run migration: `docs/safe-migration-001-complete.sql`

### Test Signup:
- [ ] Visit `/test-auth` page
- [ ] Enter test email & password
- [ ] Click "Test Signup"
- [ ] See success message
- [ ] User appears in Supabase Auth users

### Test Demo Mode Input:
- [ ] Visit homepage
- [ ] Click search input
- [ ] Try typing
- [ ] If fails, run debug script (see above)
- [ ] Report specific errors from console

---

## 🔧 Next Steps

1. **Configure Supabase** (see checklist above)
2. **Test signup** at https://describe-it-lovat.vercel.app/test-auth
3. **Debug input issue** using DevTools script
4. **Run database migrations** in Supabase SQL Editor

Need help with any specific step?
