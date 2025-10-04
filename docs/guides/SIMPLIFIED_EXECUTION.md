# 🚀 Simplified Execution Guide

Since your app uses **user-provided API keys**, the setup is MUCH simpler!

---

## 🔴 What YOU Must Do (30 minutes total)

### 1. Clean Git History (10 minutes)
```bash
# Remove the exposed vercel.env from history
git rm --cached vercel.env
git commit -m "Remove unused env file"

# Optional: Clean entire history (backup first!)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch vercel.env" \
  --prune-empty --tag-name-filter cat -- --all
```

### 2. Rotate Supabase Keys Only (10 minutes)
Since users provide their own OpenAI/Unsplash keys, you only need to rotate:
- Supabase keys (if you use Supabase)
- Any other backend service keys

### 3. Create Minimal .env.local (5 minutes)
```env
# Only YOUR server needs, not user API keys
NODE_ENV=development

# Your database
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Security
SESSION_SECRET=random-string-here
```

### 4. Update Deployment (5 minutes)
Remove OpenAI/Unsplash keys from Vercel/your platform - you don't need them!

---

## 🟢 What Claude Code Can Do

### Command 1: Clean Up Architecture
```
Update the codebase to properly implement user-provided API keys:

1. Remove all server-side OpenAI/Unsplash key loading from:
   - src/lib/api/openai-server.ts
   - src/lib/api/keyProvider.ts
   - Any API routes

2. Ensure all API endpoints properly handle userApiKey from request body

3. Add clear error messages when users haven't added their keys

4. Remove unnecessary server-side key validation
```

### Command 2: Improve User Experience
```
Enhance the API key management experience:

1. Improve the settings page UI at src/app/settings/page.tsx:
   - Add clear instructions for getting API keys
   - Add "Test Connection" buttons
   - Show key validation status
   - Add links to OpenAI and Unsplash signup

2. Create helpful onboarding:
   - First-time user detection
   - Guide to getting API keys
   - Demo mode explanation

3. Add client-side key validation before requests
```

### Command 3: Add Security (Still Important!)
```
Implement security for the user-provided key model:

1. Add rate limiting by IP address (not API key):
   - Create src/lib/rate-limiting/ip-limiter.ts
   - Limit requests per IP per minute/hour

2. Add request validation:
   - Validate request size
   - Check for malicious payloads
   - Sanitize inputs

3. Add audit logging (without logging keys):
   - Log request metadata
   - Track usage patterns
   - Detect abuse

4. Implement secure client-side key storage:
   - Encrypt keys in localStorage
   - Add key export/import functionality
```

### Command 4: Optional - Add Demo Mode
```
Create a limited demo mode for users without keys:

1. Add demo detection in src/lib/api/keyProvider.ts

2. Create demo limits:
   - Max 5 requests per day per IP
   - Basic features only
   - Watermarked outputs

3. Add demo messaging:
   - Clear indication it's demo mode
   - Encourage adding own keys
   - Show benefits of using own keys
```

---

## 📋 Super Simple Checklist

### Today (30 minutes):
- [ ] Remove vercel.env from git
- [ ] Rotate Supabase keys (if using)
- [ ] Create minimal .env.local
- [ ] Remove OpenAI/Unsplash keys from Vercel

### This Week (2 hours with Claude Code):
- [ ] Clean up server-side key loading
- [ ] Improve settings page UI
- [ ] Add rate limiting by IP
- [ ] Add security headers

### Nice to Have:
- [ ] Demo mode with strict limits
- [ ] Usage analytics (client-side)
- [ ] Key backup/restore feature
- [ ] Onboarding tutorial

---

## 🎯 One Command to Rule Them All

After doing the manual tasks, tell Claude Code:

```
The app uses user-provided API keys (users enter their own OpenAI/Unsplash keys).
Please:
1. Remove all server-side API key loading for OpenAI/Unsplash
2. Ensure endpoints use userApiKey from request body
3. Improve the settings page for key management
4. Add IP-based rate limiting
5. Add helpful error messages when keys are missing
```

---

## ✨ Why This is Better

Your current architecture is superior because:

| Old Way (Server Keys) | Your Way (User Keys) |
|----------------------|----------------------|
| You pay for API usage | Users pay for their own usage |
| Complex key management | Simple localStorage |
| Key rotation headaches | Users manage their keys |
| Rate limit issues | Each user has their own limits |
| Privacy concerns | Keys never touch your server |
| Scaling costs | Zero API costs for you |

---

## 🚦 Quick Verification

After setup, verify everything works:

```bash
# 1. Check no exposed files in git
git ls-files | grep -E "\.(env|key)" 
# Should only show .env.example

# 2. Start the app
npm run dev

# 3. Test without keys
# Should show "Please add your API keys in settings"

# 4. Add your personal keys in settings
# Should work perfectly!
```

---

## 💡 Pro Tips

1. **Don't Store User Keys Server-Side**: They should only exist in localStorage
2. **Rate Limit by IP**: Not by API key since users bring their own
3. **Log Requests, Not Keys**: Never log user API keys
4. **Clear Onboarding**: Help users understand they need their own keys
5. **Demo Mode**: Consider a limited demo with YOUR keys (heavily restricted)

---

That's it! Much simpler than the full production setup since you don't need:
- HashiCorp Vault
- Key rotation automation  
- Server-side API key management
- Complex security for YOUR keys

Just clean up the git history and improve the user experience! 🎉