# E2E Authentication Tests - Quick Start Guide

Get up and running with E2E authentication tests in 5 minutes!

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Install Playwright (1 min)

```bash
npx playwright install
```

### Step 2: Create Test Environment File (1 min)

```bash
cp .env.test.example .env.test
```

Edit `.env.test` with your credentials:

```bash
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword123
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Step 3: Run Tests (3 min)

#### Windows:
```bash
scripts\run-e2e-auth-tests.bat
```

#### Linux/Mac:
```bash
chmod +x scripts/run-e2e-auth-tests.sh
./scripts/run-e2e-auth-tests.sh
```

#### Or use npm:
```bash
npm run test:e2e
```

---

## 📋 What's Tested?

### ✅ 30 Comprehensive Tests

1. **OAuth Flow** (4 tests)
   - Google login
   - GitHub login
   - Callback handling
   - Error handling

2. **Email/Password Signup** (3 tests)
   - Valid signup
   - Duplicate email
   - Password validation

3. **Email/Password Login** (4 tests)
   - Valid login
   - Invalid credentials
   - Non-existent user
   - Timeout handling

4. **Magic Link** (1 test)
   - Magic link request

5. **Logout** (3 tests)
   - Successful logout
   - Session cleanup
   - Redirect behavior

6. **Protected Routes** (4 tests)
   - Unauthenticated blocking
   - Authenticated access
   - Persistence on reload
   - Persistence across navigation

7. **State Persistence** (3 tests)
   - LocalStorage
   - Cross-tab sync
   - Expired session

8. **Error Scenarios** (4 tests)
   - Network failures
   - Server errors
   - Validation errors
   - Rate limiting

9. **Responsiveness** (2 tests)
   - Mobile viewport
   - Tablet viewport

10. **Accessibility** (2 tests)
    - Keyboard navigation
    - ARIA labels

---

## 🎯 Common Commands

### Run All Tests
```bash
npm run test:e2e
```

### Run in Headed Mode (See Browser)
```bash
npx playwright test --headed
```

### Run Specific Test
```bash
npx playwright test -g "Email/Password Login"
```

### Debug Mode
```bash
npx playwright test --debug
```

### Generate Report
```bash
npx playwright show-report
```

---

## 📸 Screenshots

All screenshots saved to: `tests/e2e/screenshots/`

Format: `##-description-timestamp.png`

Example: `01-login-form-filled-2025-10-06T20-30-45.png`

---

## 🔍 View Results

### HTML Report
```bash
npx playwright show-report
```

Opens interactive report in browser showing:
- Test pass/fail status
- Screenshots
- Videos (on failure)
- Traces
- Timing data

### JSON Results
```bash
cat test-results/e2e-auth-results.json
```

### Console Output
Tests output detailed logs including:
- Test descriptions
- Pass/fail status
- Duration
- Error messages

---

## 🐛 Troubleshooting

### Tests Won't Start

**Check Node version:**
```bash
node --version  # Should be 20.x or higher
```

**Reinstall Playwright:**
```bash
npx playwright install --with-deps
```

### Server Not Starting

**Check port 3000:**
```bash
# Windows
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :3000
```

**Kill process if needed:**
```bash
# Windows
taskkill /PID <PID> /F

# Linux/Mac
kill -9 <PID>
```

### Tests Failing

**Check environment variables:**
```bash
cat .env.test
```

**Verify test user exists in Supabase:**
- Go to Supabase Dashboard
- Authentication → Users
- Ensure test user is created

**Check Supabase credentials:**
```bash
# Test connection
curl https://your-project.supabase.co/rest/v1/ \
  -H "apikey: your-anon-key"
```

### Screenshots Not Generated

**Check directory exists:**
```bash
mkdir -p tests/e2e/screenshots
```

**Check write permissions:**
```bash
# Linux/Mac
chmod -R 755 tests/e2e/screenshots
```

---

## 📚 Next Steps

### 1. Review Test Report
```bash
npx playwright show-report
```

### 2. Check Screenshots
```bash
# Windows
explorer tests\e2e\screenshots

# Linux/Mac
open tests/e2e/screenshots
```

### 3. Read Full Documentation
- `tests/e2e/README.md` - Complete test documentation
- `docs/reports/e2e-auth-test-results.md` - Test results report
- `docs/CI-CD-E2E-INTEGRATION.md` - CI/CD integration guide

### 4. Add to CI/CD
See `docs/CI-CD-E2E-INTEGRATION.md` for:
- GitHub Actions setup
- GitLab CI
- CircleCI
- Jenkins
- Azure DevOps

### 5. Customize Tests
- Add new test cases in `tests/e2e/auth-flows.spec.ts`
- Update test configuration in `tests/e2e/helpers/test-config.ts`
- Extend helpers in `tests/e2e/helpers/auth-helpers.ts`

---

## 💡 Tips

### Run Tests on Multiple Browsers
```bash
# Chrome only
npx playwright test --project=chromium

# Firefox only
npx playwright test --project=firefox

# All browsers
npx playwright test --project=chromium --project=firefox --project=webkit
```

### Run Specific Test File
```bash
npx playwright test tests/e2e/auth-flows.spec.ts
```

### Run Tests Matching Pattern
```bash
# All login tests
npx playwright test -g "login"

# All error scenarios
npx playwright test -g "Error Scenarios"
```

### Slow Motion (See What's Happening)
```bash
npx playwright test --headed --slow-mo=1000
```

### Update Snapshots
```bash
npx playwright test --update-snapshots
```

---

## 🎓 Learning Resources

### Playwright Documentation
- [Official Docs](https://playwright.dev)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
- [Best Practices](https://playwright.dev/docs/best-practices)

### Supabase Auth
- [Auth Documentation](https://supabase.com/docs/guides/auth)
- [Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers)

### E2E Testing
- [Testing Best Practices](https://playwright.dev/docs/best-practices)
- [Test Organization](https://playwright.dev/docs/test-annotations)
- [Fixtures](https://playwright.dev/docs/test-fixtures)

---

## 📞 Need Help?

### Check Issues
- Review existing issues in `tests/e2e/`
- Check CI/CD logs for errors

### Debug Steps
1. Run in headed mode: `npx playwright test --headed`
2. Add `await page.pause()` to stop at breakpoint
3. Check browser console for errors
4. Review screenshots in `tests/e2e/screenshots/`
5. Check server logs

### Common Solutions

**"Browser not found"**
```bash
npx playwright install chromium
```

**"Port already in use"**
```bash
# Change port in .env.test
BASE_URL=http://localhost:3001
```

**"Authentication failed"**
- Verify test user exists in Supabase
- Check credentials in .env.test
- Ensure Supabase project is active

---

## ✅ Success Checklist

- [ ] Playwright installed
- [ ] `.env.test` configured with valid credentials
- [ ] Test user created in Supabase
- [ ] Tests run successfully
- [ ] HTML report generated
- [ ] Screenshots captured
- [ ] CI/CD integration planned

---

## 🎉 You're Ready!

Your E2E authentication test suite is ready to use. Run tests regularly to catch issues early!

**Pro Tip**: Add tests to your pre-commit hooks or CI/CD pipeline for maximum effectiveness.

---

**Quick Links**:
- [Full Documentation](README.md)
- [Test Results](../../docs/reports/e2e-auth-test-results.md)
- [CI/CD Guide](../../docs/CI-CD-E2E-INTEGRATION.md)

**Last Updated**: October 6, 2025
