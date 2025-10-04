# Smoke Test Checklist - Weeks 1-4 Critical Fixes

**Version**: 1.0.0
**Last Updated**: October 2, 2025
**Purpose**: Pre-deployment smoke tests for critical functionality

---

## Pre-Deployment Smoke Tests

### 1. Environment Configuration

- [ ] `.env.local` file exists in project root
- [ ] Run `npm run validate:env` - should pass
- [ ] All required API keys configured:
  - [ ] `UNSPLASH_ACCESS_KEY`
  - [ ] `OPENAI_API_KEY`
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Node.js version >= 20.11.0 (`node --version`)
- [ ] npm version >= 10.0.0 (`npm --version`)

### 2. Build & Compilation

- [ ] `npm run typecheck` completes without errors
- [ ] `npm run lint` passes with no errors
- [ ] `npm run build` completes successfully
- [ ] Build completes in < 5 minutes
- [ ] No warnings about missing dependencies
- [ ] `.next` directory created successfully

### 3. Development Server

- [ ] `npm run dev` starts without errors
- [ ] Server accessible at `http://localhost:3000`
- [ ] No console errors on startup
- [ ] Hot Module Replacement (HMR) working

### 4. Core Functionality

#### 4.1 Homepage
- [ ] Homepage loads without errors
- [ ] All UI components render correctly
- [ ] No console errors in browser
- [ ] Images load properly
- [ ] Navigation menu works

#### 4.2 Image Search
- [ ] Search bar accepts input
- [ ] Search returns results
- [ ] Images display correctly
- [ ] Click on image to select
- [ ] Selected image highlights properly

#### 4.3 Description Generation
- [ ] Generate description button enabled after image selection
- [ ] Description generates successfully
- [ ] Description displays in correct language (Spanish/English toggle)
- [ ] Description styles work (narrativo, poetico, etc.)
- [ ] Loading state displays during generation
- [ ] Error handling works if API fails

#### 4.4 Q&A Generation
- [ ] Q&A panel accessible
- [ ] Questions generate from description
- [ ] Questions display correctly
- [ ] Answers can be revealed/hidden
- [ ] Multiple question types supported

#### 4.5 Vocabulary Extraction
- [ ] Vocabulary panel accessible
- [ ] Words extracted from description
- [ ] Difficulty levels assigned
- [ ] Word definitions available
- [ ] Click-to-add functionality works
- [ ] Categories correctly identified

#### 4.6 Export Functionality
- [ ] Export button accessible
- [ ] PDF export works
- [ ] CSV export works
- [ ] JSON export works
- [ ] Exported files contain correct data
- [ ] File downloads successfully

### 5. API Endpoints

#### 5.1 Health & Status
```bash
# All should return 200 OK
curl http://localhost:3000/api/health
curl http://localhost:3000/api/env-status
curl http://localhost:3000/api/cache/status
```

- [ ] `/api/health` returns `{"status": "ok"}`
- [ ] `/api/env-status` returns environment configuration
- [ ] Response times < 100ms

#### 5.2 Core API Endpoints
```bash
# Test image descriptions
curl -X POST http://localhost:3000/api/descriptions/generate \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://images.unsplash.com/photo-test"}'

# Test image search
curl http://localhost:3000/api/images/search?query=nature
```

- [ ] POST `/api/descriptions/generate` returns description
- [ ] GET `/api/images/search` returns image results
- [ ] Error handling returns appropriate status codes
- [ ] Response times < 2 seconds

### 6. Authentication (if enabled)

- [ ] Registration page accessible
- [ ] User can register with email/password
- [ ] Validation errors display correctly
- [ ] Login page accessible
- [ ] User can login
- [ ] Session persists on page reload
- [ ] Logout functionality works
- [ ] Password reset flow works

### 7. Database

- [ ] Database connection successful
- [ ] Migrations applied successfully
- [ ] Can query users table
- [ ] Can query sessions table
- [ ] Can query images table
- [ ] Can query descriptions table
- [ ] Foreign key constraints working

### 8. Performance

- [ ] Homepage loads in < 3 seconds
- [ ] API responses < 2 seconds
- [ ] Image search < 1 second
- [ ] Description generation < 5 seconds
- [ ] No memory leaks during 5-minute session
- [ ] Browser console shows no errors

### 9. Error Handling

- [ ] Invalid API requests return proper error messages
- [ ] Network errors handled gracefully
- [ ] Missing API keys show helpful error
- [ ] Rate limiting works (if enabled)
- [ ] Error dashboard displays errors
- [ ] Sentry integration working (if configured)

### 10. Security

- [ ] CORS headers configured correctly
- [ ] API keys not exposed in client
- [ ] Input validation working
- [ ] XSS protection active
- [ ] SQL injection prevention tested
- [ ] Rate limiting functional

### 11. Docker (if applicable)

```bash
# Build Docker image
docker build -f config/docker/Dockerfile -t describe-it:test .

# Run container
docker run -p 3000:3000 --env-file .env.local describe-it:test
```

- [ ] Docker image builds successfully
- [ ] Container starts without errors
- [ ] Application accessible in container
- [ ] Health check passes
- [ ] Logs show no errors

### 12. Deployment Readiness

- [ ] All tests passing (`npm run test`)
- [ ] TypeScript compilation clean
- [ ] ESLint passes
- [ ] Production build successful
- [ ] Environment variables documented
- [ ] Deployment scripts tested
- [ ] Rollback procedure documented
- [ ] Monitoring configured

---

## Critical Path Testing

### Scenario 1: New User Journey
1. [ ] User visits homepage
2. [ ] User searches for image
3. [ ] User selects image
4. [ ] User generates description
5. [ ] User generates Q&A
6. [ ] User extracts vocabulary
7. [ ] User exports data
8. [ ] No errors at any step

### Scenario 2: API Key Flow
1. [ ] User without API key visits app
2. [ ] Demo mode activates
3. [ ] User enters API key
4. [ ] API key validates successfully
5. [ ] Full functionality unlocked
6. [ ] API key persists in settings

### Scenario 3: Error Recovery
1. [ ] Network disconnected
2. [ ] Error message displays
3. [ ] User retries action
4. [ ] Network reconnected
5. [ ] Action succeeds
6. [ ] No data loss

---

## Sign-Off

### Tester Information
- **Name**: _________________
- **Date**: _________________
- **Environment**: [ ] Development [ ] Staging [ ] Production

### Results
- **Total Checks**: _______
- **Passed**: _______
- **Failed**: _______
- **Skipped**: _______

### Status
- [ ] ✅ **PASS** - All critical tests passed
- [ ] ⚠️ **PASS WITH WARNINGS** - Non-critical issues found
- [ ] ❌ **FAIL** - Critical issues blocking deployment

### Notes
```
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
```

### Approval
- **Approved By**: _________________
- **Signature**: _________________
- **Date**: _________________

---

**Next Steps After Smoke Tests**:
1. If PASS: Proceed to production deployment
2. If PASS WITH WARNINGS: Document issues, deploy with monitoring
3. If FAIL: Fix critical issues, re-run smoke tests
