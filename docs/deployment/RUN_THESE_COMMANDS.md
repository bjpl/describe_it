# Commands to Run for Deployment Preparation

**Status:** Phase 1 dependencies updated in package.json
**Next:** Run these commands in sequence

---

## Step 1: Install Updated Dependencies

```bash
# Navigate to project root
cd /mnt/c/Users/brand/Development/Project_Workspace/active-development/describe_it

# Option A: Clean install (recommended)
rm -rf node_modules
npm install

# Option B: If clean install fails, try regular install
npm install
```

**Expected Result:**
- Installation completes successfully
- No errors displayed
- package-lock.json updated with new versions:
  - sharp@0.34.4
  - @vercel/blob@2.0.0

---

## Step 2: Verify TypeScript (MUST PASS)

```bash
npm run typecheck
```

**Expected Result:**
- Exit code: 0
- Output: No errors found
- Must show: "0 errors"

**If Errors:**
- Review TypeScript errors
- Fix any type issues before proceeding

---

## Step 3: Verify Linting

```bash
npm run lint
```

**Expected Result:**
- <5 warnings (current baseline)
- No critical errors
- Build-blocking issues resolved

**If Too Many Warnings:**
- Review ESLint output
- Address critical warnings
- Can proceed if <5 warnings

---

## Step 4: Build the Application (MUST PASS)

```bash
npm run build
```

**Expected Result:**
- Build completes successfully
- Output shows "Build completed successfully"
- No build errors
- .next directory created

**If Build Fails:**
- Review error messages
- Check TypeScript errors: `npm run typecheck`
- Check for missing dependencies
- Do NOT proceed to deployment

---

## Step 5: Run Test Suite

```bash
npm run test:run
```

**Expected Result:**
- All tests pass
- No test failures
- Coverage metrics displayed

**If Tests Fail:**
- Review failing tests
- Fix test issues
- Re-run until all pass

---

## Step 6: Local Testing

```bash
npm run dev
```

**Manual Testing Checklist:**
- [ ] App starts on http://localhost:3000
- [ ] No console errors in terminal
- [ ] Homepage loads without errors
- [ ] No red errors in browser console
- [ ] Image upload functionality works
- [ ] Authentication flow works
- [ ] Database queries successful

**Press Ctrl+C to stop dev server when done**

---

## Step 7: Verify Dependency Updates

```bash
# Check sharp version
npm list sharp

# Check @vercel/blob version
npm list @vercel/blob
```

**Expected Output:**
- sharp@0.34.4
- @vercel/blob@2.0.0

---

## Quick Verification Script (All at Once)

```bash
# Run all verification steps
echo "=== TypeScript Check ===" && \
npm run typecheck && \
echo "=== Linting ===" && \
npm run lint && \
echo "=== Build ===" && \
npm run build && \
echo "=== Tests ===" && \
npm run test:run && \
echo "=== ALL CHECKS PASSED ==="
```

**Expected:**
- All steps complete successfully
- Final message: "ALL CHECKS PASSED"

---

## If Everything Passes

**You are ready for production deployment!**

Next steps:
1. Review `/docs/deployment/PRODUCTION_DEPLOYMENT_CHECKLIST.md`
2. Set up Supabase production database
3. Configure Vercel environment variables
4. Schedule deployment window
5. Execute production deployment

---

## If Issues Occur

### Rollback to Previous Versions

```bash
# Restore original package files
cp package.json.backup package.json
cp package-lock.json.backup package-lock.json

# Reinstall original versions
rm -rf node_modules
npm install
```

### Common Issues

**npm install timeout:**
- Run in native Windows terminal (not WSL)
- Or use: `npm install --prefer-offline`

**Build fails:**
- Clear cache: `npm run clean && npm run build`
- Check: `npm run typecheck` for TS errors

**Tests fail:**
- Check test environment setup
- Verify .env.test configuration
- Review specific test failures

---

## Success Criteria Checklist

Before proceeding to production:

- [ ] npm install completed successfully
- [ ] TypeScript: 0 errors
- [ ] ESLint: <5 warnings
- [ ] Build: Success, no errors
- [ ] Tests: All passing
- [ ] Local dev: App runs without errors
- [ ] Dependencies verified: sharp@0.34.4, @vercel/blob@2.0.0

---

## Documentation Reference

**Deployment Guides Created:**
1. `/docs/deployment/PRODUCTION_DEPLOYMENT_CHECKLIST.md` - Full deployment process
2. `/docs/deployment/DEPLOYMENT_READINESS_SUMMARY.md` - Risk assessment & details
3. `/docs/deployment/NEXT_STEPS.md` - Sequential action guide
4. `/docs/deployment/DEPLOYMENT_SUMMARY_2025-10-18.md` - Executive summary
5. `/docs/deployment/RUN_THESE_COMMANDS.md` - This file

---

**Last Updated:** 2025-10-18
**Status:** Ready for npm install
