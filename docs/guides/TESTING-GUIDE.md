# User Testing Guide - Describe It

## Quick Start Testing

### 1. Run the App Locally

```bash
# Install dependencies (if not already done)
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys:
# - OPENAI_API_KEY
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - UNSPLASH_ACCESS_KEY

# Start development server
npm run dev

# App will be available at: http://localhost:3000
```

### 2. Test on Staging/Production

**Option A: Deploy to Vercel (Recommended)**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

**Option B: Docker (Local Production Build)**

```bash
# Build and run production version
docker-compose up --build

# App available at: http://localhost:3000
```

### 3. Core Features Testing Checklist

#### Authentication Flow

- [ ] Sign up with email
- [ ] Sign in with email
- [ ] Sign in with Google OAuth
- [ ] Sign in with GitHub OAuth
- [ ] Password reset flow
- [ ] Sign out

#### Image Upload & Search

- [ ] Upload a local image
- [ ] Search for image using Unsplash
- [ ] Image displays correctly
- [ ] Image caching works

#### Description Generation

- [ ] Generate "Narrativo" style description
- [ ] Generate "Poético" style description
- [ ] Generate "Académico" style description
- [ ] Generate "Conversacional" style description
- [ ] Generate "Infantil" style description
- [ ] Descriptions are in Spanish
- [ ] Text-to-speech works (if available)

#### Interactive Q&A System

- [ ] Questions are generated
- [ ] Can answer questions
- [ ] Answer validation works
- [ ] Feedback is provided
- [ ] Confidence scoring displays
- [ ] Different difficulty levels work

#### Vocabulary Extraction

- [ ] Vocabulary is extracted from descriptions
- [ ] Phrases are categorized correctly
- [ ] Flashcards display properly
- [ ] Spaced repetition system works
- [ ] Can mark words as learned

#### Session Management

- [ ] Progress is tracked
- [ ] Learning history displays
- [ ] Can export session data (CSV)
- [ ] Can export session data (PDF)
- [ ] Can export session data (JSON)

#### Dashboard & Analytics

- [ ] User statistics display
- [ ] Learning progress charts work
- [ ] Performance metrics are accurate
- [ ] Charts render correctly

#### Performance & UX

- [ ] Pages load quickly
- [ ] No console errors
- [ ] Mobile responsive design works
- [ ] Images are optimized
- [ ] Smooth animations

### 4. Testing on Different Devices

**Desktop Browsers**

- Chrome/Edge
- Firefox
- Safari

**Mobile Testing**

```bash
# Get your local IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# Access from mobile: http://[YOUR_IP]:3000
```

**Responsive Testing in Browser**

- Use Chrome DevTools (F12 → Device Toolbar)
- Test: Mobile (375px), Tablet (768px), Desktop (1920px)

### 5. Common Issues to Check

- [ ] API rate limits not exceeded
- [ ] Error messages are user-friendly
- [ ] Loading states display properly
- [ ] Empty states handled gracefully
- [ ] Forms validate input correctly
- [ ] Images handle different aspect ratios
- [ ] Long text doesn't break layout
- [ ] Network errors are caught

### 6. Check Logs & Monitoring

```bash
# View server logs
npm run dev
# Watch for errors in terminal

# Check browser console
# F12 → Console tab → Look for errors

# Run health check
curl http://localhost:3000/api/health
```

### 7. Run Automated Tests (Optional)

```bash
# Run all tests
npm test

# Run E2E smoke tests
npm run test:smoke

# Check test coverage
npm run test:coverage
```

## Tips for Effective Self-Testing

1. **Test user flows end-to-end**: Start from signup → upload image → generate descriptions → complete Q&A → review progress

2. **Try edge cases**:
   - Very long Spanish descriptions
   - Images with no clear subject
   - Rapid clicking/interaction
   - Slow network simulation

3. **Take notes**: Keep a simple list of bugs or UX issues you find

4. **Test with real use case**: Use images you'd actually use for learning Spanish

5. **Clear data between tests**: Use incognito mode or clear browser data to test fresh user experience

## Quick Bug Report Template

When you find issues, note:

- **What happened**: [describe the bug]
- **Expected**: [what should happen]
- **Steps to reproduce**: [list steps]
- **Browser/Device**: [e.g., Chrome on MacOS]
- **Screenshot**: [if helpful]

## Need Help?

- Check logs: `npm run dev` terminal output
- Check browser console: F12 → Console
- Review error monitoring: Check Sentry if configured
- Database: Check Supabase dashboard for data issues
