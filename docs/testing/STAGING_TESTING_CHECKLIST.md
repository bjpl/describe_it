# 🧪 Staging Testing Checklist

## 🚀 **Live Staging Environment**

**Preview URL**: https://describe-63mra8lir-brandon-lamberts-projects-a9841bf5.vercel.app

**Deployment Info:**
- Build Time: 21 seconds
- Status: ✅ Live
- Environment: Preview (Production config)
- Version: Latest from `main` branch (commit 1b37533)

---

## ✅ **Quick Test Scenarios (15 minutes)**

### 1. **Basic Load Test** (1 min)
- [ ] Open staging URL
- [ ] Page loads without errors
- [ ] Open browser DevTools Console
- [ ] Verify no red errors in console

**Expected**: App loads, no console errors

---

### 2. **Image Search** (2 min)
- [ ] Click on image search or input field
- [ ] Search for: "mountain sunset"
- [ ] Verify images load from Unsplash
- [ ] Click on an image to select it

**Expected**: Images display, can select image

**If fails**: Check Unsplash API key in Vercel env vars

---

### 3. **AI Description Generation** (3 min)
- [ ] With image selected, click "Generate Description"
- [ ] Wait for Claude API response (may take 5-15 seconds)
- [ ] Verify description appears
- [ ] Try different styles (narrativo, poetico, academico)

**Expected**: Description generates in Spanish

**If fails**:
- Check Anthropic API key
- Check Sentry for API errors
- Monitor for quota/rate limit issues

---

### 4. **Q&A Generation** (2 min)
- [ ] Navigate to Q&A section
- [ ] Input sample text or use description
- [ ] Click "Generate Questions"
- [ ] Verify Q&A pairs appear

**Expected**: Questions and answers in Spanish

**If fails**: Check Claude API integration

---

### 5. **Translation** (2 min)
- [ ] Navigate to translation feature
- [ ] Input English text
- [ ] Select target language (Spanish)
- [ ] Click "Translate"
- [ ] Verify translation appears

**Expected**: Accurate Spanish translation

**If fails**: Check Claude translation endpoint

---

### 6. **Authentication** (3 min)
- [ ] Click "Login" or "Sign Up"
- [ ] Try to authenticate with Supabase
- [ ] Test OAuth (Google/GitHub) if configured
- [ ] Test email/password flow

**Expected**: Can log in, session persists

**If fails**:
- Check Supabase URL/keys
- Check auth callback route
- Verify CORS settings

---

### 7. **Responsive Design** (2 min)
- [ ] Resize browser to mobile width (375px)
- [ ] Verify UI adapts
- [ ] Test navigation menu
- [ ] Check image display

**Expected**: Mobile-friendly layout

---

## 🔍 **Monitoring & Debugging**

### Browser DevTools
```javascript
// Check console for errors
// Network tab: Check API calls
// Application tab: Check localStorage/cookies
```

### Sentry Dashboard
**URL**: https://sentry.io/organizations/[your-org]/projects/describe-it/

**Look for:**
- [ ] Error count spike
- [ ] Performance issues
- [ ] Failed API calls
- [ ] User feedback errors

### Vercel Dashboard
**Inspect Deployment**: https://vercel.com/brandon-lamberts-projects-a9841bf5/describe-it/AFW3DYwjUgUfmivi4RHgpw2uupHu

**Check:**
- [ ] Build logs
- [ ] Function execution logs
- [ ] Real-time logs
- [ ] Performance metrics

---

## 📝 **Issue Template**

When you find an issue, document it like this:

```markdown
### Issue: [Short description]
- **Severity**: Critical / High / Medium / Low
- **Category**: UI / API / Auth / Performance / Other
- **Steps to reproduce**:
  1. Step 1
  2. Step 2
  3. Error occurs
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Error message**: Copy from console/Sentry
- **Screenshot**: [if applicable]
```

---

## 🎯 **Success Criteria**

**Staging is successful if 6/7 scenarios work:**
- ✅ App loads (must work)
- ✅ Image search (must work)
- ✅ Description generation (must work)
- ⚠️ Q&A (nice to have)
- ⚠️ Translation (nice to have)
- ⚠️ Auth (nice to have - DB not migrated)
- ⚠️ Responsive (nice to have)

**Red flags (need immediate fix):**
- ❌ App doesn't load
- ❌ All API calls fail
- ❌ Claude API errors (check quota)
- ❌ CORS blocks all requests

---

## 📊 **Performance Benchmarks**

Target metrics:
- **Page Load**: < 3 seconds
- **Description Generation**: < 15 seconds
- **Image Search**: < 2 seconds
- **Q&A Generation**: < 10 seconds
- **Translation**: < 5 seconds

---

## 🔄 **Testing Iterations**

### Round 1: Basic Functionality
Date: [Fill in]
Tester: [You]
Results: [Document here]

### Round 2: Edge Cases
Date: [Fill in after Round 1]
Focus: Error handling, slow network, edge cases

### Round 3: Performance
Date: [Fill in]
Focus: Response times, concurrent users

---

## 🚨 **Known Issues (Expected)**

These are KNOWN and OKAY for staging:
1. ✅ Database features won't work (not migrated)
2. ✅ Some TypeScript warnings in console (20 errors)
3. ✅ localStorage features incomplete (12 tests)
4. ✅ Performance not optimized (will iterate)

Don't worry about these - focus on core functionality!

---

## 🎉 **Next Steps After Testing**

1. **Document findings** in `docs/STAGING_ISSUES.md`
2. **Prioritize fixes** (critical → high → medium → low)
3. **Create GitHub issues** for each problem
4. **Fix critical issues** first
5. **Re-deploy** and test again
6. **Iterate** until stable

---

**Remember: We're shipping to learn! Document what breaks, fix what matters, iterate quickly.** 🚀
