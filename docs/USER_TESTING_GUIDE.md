# Describe It - User Testing Guide

**Version:** 1.0
**Last Updated:** November 29, 2025

---

## Production Links

| Environment           | URL                                                                      |
| --------------------- | ------------------------------------------------------------------------ |
| **Production**        | https://describe-it-lovat.vercel.app                                     |
| **Latest Deployment** | https://describe-azj6sibvy-brandon-lamberts-projects-a9841bf5.vercel.app |
| **Vercel Dashboard**  | https://vercel.com/brandon-lamberts-projects-a9841bf5/describe-it        |

### Direct Page Links

| Page               | URL                                               |
| ------------------ | ------------------------------------------------- |
| **Homepage**       | https://describe-it-lovat.vercel.app              |
| **Dashboard**      | https://describe-it-lovat.vercel.app/dashboard    |
| **Auth Test Page** | https://describe-it-lovat.vercel.app/test-auth    |
| **API Key Test**   | https://describe-it-lovat.vercel.app/test-api-key |
| **Admin**          | https://describe-it-lovat.vercel.app/admin        |

### API Endpoints (Production)

| Endpoint         | Full URL                                         |
| ---------------- | ------------------------------------------------ |
| **Health Check** | https://describe-it-lovat.vercel.app/api/health  |
| **Status**       | https://describe-it-lovat.vercel.app/api/status  |
| **Metrics**      | https://describe-it-lovat.vercel.app/api/metrics |

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication Flows](#authentication-flows)
3. [Image Search](#image-search)
4. [Description Generation](#description-generation)
5. [Q&A Practice](#qa-practice)
6. [Vocabulary & Phrases](#vocabulary--phrases)
7. [Flashcard Review](#flashcard-review)
8. [Dashboard & Progress](#dashboard--progress)
9. [Settings & Configuration](#settings--configuration)
10. [Export & Import](#export--import)
11. [Keyboard Shortcuts](#keyboard-shortcuts)
12. [Troubleshooting](#troubleshooting)

---

## Quick Start

### First-Time User Flow

| Step | Action                                       | Expected Result                                                                   |
| ---- | -------------------------------------------- | --------------------------------------------------------------------------------- |
| 1    | Navigate to the app homepage                 | Homepage loads with 4 tabs: Search Images, Descriptions, Q&A Practice, Vocabulary |
| 2    | Click the **Settings** gear icon (top right) | Settings modal opens                                                              |
| 3    | Go to **API Keys** section                   | API key management interface appears                                              |
| 4    | Enter your Anthropic API key                 | Key is validated and saved                                                        |
| 5    | Search for an image                          | Image grid displays results                                                       |
| 6    | Click an image to select it                  | Automatically switches to Descriptions tab                                        |

---

## Authentication Flows

### Test Page

**URL:** https://describe-it-lovat.vercel.app/test-auth

### 1. Sign Up (New Account)

| Step | Action                                              | Expected Result                     |
| ---- | --------------------------------------------------- | ----------------------------------- |
| 1    | Click **Sign Up** or user icon (top right)          | Auth modal opens with sign up form  |
| 2    | Enter email address                                 | Email field accepts valid format    |
| 3    | Enter password (min 8 chars, 1 uppercase, 1 number) | Password strength indicator updates |
| 4    | Confirm password                                    | Passwords must match                |
| 5    | Click **Create Account**                            | Success message, redirected to app  |

**Test Cases:**

- [ ] Valid email and strong password - should succeed
- [ ] Invalid email format - should show error
- [ ] Weak password - should show requirements
- [ ] Mismatched passwords - should show error
- [ ] Existing email - should show "already registered" error

### 2. Sign In (Existing Account)

| Step | Action                 | Expected Result                  |
| ---- | ---------------------- | -------------------------------- |
| 1    | Click **Sign In**      | Auth modal with login form       |
| 2    | Enter registered email | Email field accepts input        |
| 3    | Enter password         | Password field is masked         |
| 4    | Click **Sign In**      | Success, user menu shows profile |

**Test Cases:**

- [ ] Correct credentials - should log in successfully
- [ ] Wrong password - should show "invalid credentials"
- [ ] Non-existent email - should show "user not found"
- [ ] Empty fields - should show validation errors

### 3. Password Reset

| Step | Action                            | Expected Result               |
| ---- | --------------------------------- | ----------------------------- |
| 1    | Click **Forgot Password?**        | Password reset form appears   |
| 2    | Enter registered email            | Email field accepts input     |
| 3    | Click **Send Reset Link**         | Success message shown         |
| 4    | Check email for reset link        | Email contains reset URL      |
| 5    | Click link and enter new password | Password updated successfully |

**Test Cases:**

- [ ] Valid email - should send reset email
- [ ] Invalid email - should show error
- [ ] Expired reset token - should show "link expired"

### 4. Sign Out

| Step | Action                      | Expected Result                    |
| ---- | --------------------------- | ---------------------------------- |
| 1    | Click user menu (top right) | Dropdown menu opens                |
| 2    | Click **Sign Out**          | Logged out, redirected to homepage |

---

## Image Search

### Location

**Tab:** Search Images (first tab on homepage)

### Basic Search Flow

| Step | Action                       | Expected Result                              |
| ---- | ---------------------------- | -------------------------------------------- |
| 1    | Click "Search Images" tab    | Search interface loads                       |
| 2    | Type keyword (e.g., "beach") | Search input accepts text                    |
| 3    | Press Enter or click Search  | Loading spinner appears                      |
| 4    | Wait for results             | Image grid displays 20+ results              |
| 5    | Hover over image             | Hover effect shows photographer credit       |
| 6    | Click image                  | Image selected, switches to Descriptions tab |

### Advanced Search with Filters

| Step | Action                                            | Expected Result                    |
| ---- | ------------------------------------------------- | ---------------------------------- |
| 1    | Click **Filters** button                          | Filter panel expands               |
| 2    | Select orientation (Landscape/Portrait/Square)    | Filter applied                     |
| 3    | Select category (Nature/People/Tech/Architecture) | Filter applied                     |
| 4    | Select color filter                               | Results filtered by dominant color |
| 5    | Click **Apply Filters**                           | New results load with filters      |

**Test Cases:**

- [ ] Search "nature" - should return nature images
- [ ] Search "ciudad" (Spanish) - should return city images
- [ ] Empty search - should show error or popular images
- [ ] Filter by landscape - should only show landscape images
- [ ] Pagination - click "Next" to load more results

### Pagination

| Step | Action                      | Expected Result             |
| ---- | --------------------------- | --------------------------- |
| 1    | Scroll to bottom of results | Pagination controls visible |
| 2    | Click "Next"                | Next page of results loads  |
| 3    | Click page number           | Jumps to that page          |
| 4    | Click "Previous"            | Returns to previous page    |

---

## Description Generation

### Location

**Tab:** Descriptions (second tab)
**Prerequisite:** Must have an image selected

### Generate Descriptions Flow

| Step | Action                          | Expected Result                            |
| ---- | ------------------------------- | ------------------------------------------ |
| 1    | Select an image from Search tab | Automatically switches to Descriptions     |
| 2    | View selected image preview     | Image displays at top of panel             |
| 3    | Select description style        | Style selector updates                     |
| 4    | Click **Generate Description**  | Loading indicator appears                  |
| 5    | Wait for generation (10-30 sec) | Two descriptions appear: English & Spanish |
| 6    | Read generated descriptions     | Both languages displayed side-by-side      |

### Description Styles

| Style              | Description                   | Best For                  |
| ------------------ | ----------------------------- | ------------------------- |
| **Narrativo**      | Story-like, flowing narrative | Engaging reading practice |
| **Poetico**        | Poetic, metaphorical language | Advanced vocabulary       |
| **Academico**      | Formal, educational tone      | Technical vocabulary      |
| **Conversacional** | Casual, everyday language     | Beginner learners         |
| **Infantil**       | Simple, child-friendly        | Basic vocabulary          |

### Test Each Style

| Step | Action                   | Expected Result                       |
| ---- | ------------------------ | ------------------------------------- |
| 1    | Select "Narrativo" style | Style highlighted                     |
| 2    | Click Generate           | Narrative-style description generated |
| 3    | Repeat for each style    | Each style produces distinct output   |

**Test Cases:**

- [ ] Generate with no image selected - should show "Select an image first"
- [ ] Generate each style - should produce different descriptions
- [ ] Re-generate same image - should produce new variation
- [ ] Network error during generation - should show retry option

### Save Description

| Step | Action                    | Expected Result           |
| ---- | ------------------------- | ------------------------- |
| 1    | Generate a description    | Description appears       |
| 2    | Click **Save** button     | Confirmation message      |
| 3    | Access saved descriptions | Description in saved list |

---

## Q&A Practice

### Location

**Tab:** Q&A Practice (third tab)
**Prerequisite:** Must have a description generated

### Start Q&A Session

| Step | Action                            | Expected Result           |
| ---- | --------------------------------- | ------------------------- |
| 1    | Navigate to Q&A Practice tab      | Q&A interface loads       |
| 2    | Verify description is available   | Description preview shown |
| 3    | Select number of questions (1-10) | Number selector updates   |
| 4    | Click **Generate Questions**      | Loading indicator appears |
| 5    | Wait for generation               | First question displays   |

### Answer Questions

| Step | Action                          | Expected Result                    |
| ---- | ------------------------------- | ---------------------------------- |
| 1    | Read the question (in Spanish)  | Question text displayed clearly    |
| 2    | View multiple choice options    | 4 options labeled A-D              |
| 3    | Click your answer               | Answer highlighted                 |
| 4    | Click **Submit** or press Enter | Answer evaluated                   |
| 5    | View feedback                   | Correct/incorrect with explanation |
| 6    | Click **Next Question**         | Next question loads                |

### Question Navigation

| Step | Action                             | Expected Result         |
| ---- | ---------------------------------- | ----------------------- |
| 1    | View progress indicator            | Shows "Question X of Y" |
| 2    | Click question number in navigator | Jumps to that question  |
| 3    | Complete all questions             | Summary screen appears  |

### Session Summary

| Step | Action                   | Expected Result                        |
| ---- | ------------------------ | -------------------------------------- |
| 1    | Finish all questions     | Summary page displays                  |
| 2    | View score               | Percentage and correct count shown     |
| 3    | Review incorrect answers | Wrong answers listed with explanations |
| 4    | Click **Export Results** | Download CSV of responses              |
| 5    | Click **New Session**    | Returns to Q&A start                   |

**Test Cases:**

- [ ] Answer all correctly - should show 100% score
- [ ] Answer all incorrectly - should show 0% with explanations
- [ ] Navigate between questions - should preserve answers
- [ ] Export to CSV - should download valid CSV file

---

## Vocabulary & Phrases

### Location

**Tab:** Vocabulary (fourth tab)
**Prerequisite:** Must have a description generated

### Extract Vocabulary

| Step | Action                       | Expected Result                |
| ---- | ---------------------------- | ------------------------------ |
| 1    | Navigate to Vocabulary tab   | Vocabulary interface loads     |
| 2    | Verify description available | Description preview shown      |
| 3    | Select difficulty level      | Beginner/Intermediate/Advanced |
| 4    | Click **Extract Vocabulary** | Loading indicator              |
| 5    | Wait for extraction          | Vocabulary cards appear        |

### Vocabulary Card Features

| Element         | Description                       | Action                      |
| --------------- | --------------------------------- | --------------------------- |
| **Word**        | Spanish word/phrase               | Click to hear pronunciation |
| **Article**     | el/la/los/las (if noun)           | Displayed next to word      |
| **Category**    | sustantivo, verbo, adjetivo, etc. | Color-coded badge           |
| **Difficulty**  | beginner/intermediate/advanced    | Color-coded badge           |
| **Definition**  | Spanish definition                | Always visible              |
| **Translation** | English translation               | Click to reveal             |
| **Example**     | Usage in context                  | From the description        |

### Filter Vocabulary

| Step | Action                         | Expected Result           |
| ---- | ------------------------------ | ------------------------- |
| 1    | Click category filter dropdown | Options appear            |
| 2    | Select "Verbos"                | Only verbs displayed      |
| 3    | Click difficulty filter        | Options appear            |
| 4    | Select "Beginner"              | Only beginner words shown |
| 5    | Click **Clear Filters**        | All words visible again   |

### Save Vocabulary

| Step | Action                            | Expected Result            |
| ---- | --------------------------------- | -------------------------- |
| 1    | Click **Save** on vocabulary card | Card saved to collection   |
| 2    | Click **Save All**                | All extracted words saved  |
| 3    | Access saved vocabulary           | Words appear in collection |

**Test Cases:**

- [ ] Extract from long description - should find 15-25 words
- [ ] Extract from short description - should find 5-10 words
- [ ] Filter by category - should only show that category
- [ ] Save individual word - should add to collection
- [ ] Save all words - should add all to collection

---

## Flashcard Review

### Location

**Component:** Available from Vocabulary tab or Dashboard

### Start Flashcard Session

| Step | Action                      | Expected Result        |
| ---- | --------------------------- | ---------------------- |
| 1    | Click **Review Flashcards** | Flashcard mode opens   |
| 2    | View progress bar           | Shows X of Y cards     |
| 3    | See card counter            | "Card 1 of 20"         |
| 4    | View front of card          | Spanish word displayed |

### Flashcard Interaction

| Step | Action                          | Expected Result                           |
| ---- | ------------------------------- | ----------------------------------------- |
| 1    | View front of card              | Word, article, category, difficulty shown |
| 2    | Click **Listen** (speaker icon) | Word pronounced aloud                     |
| 3    | Click **Hint** (eye icon)       | Context hint appears                      |
| 4    | Click card or press Space       | Card flips to back                        |
| 5    | View back of card               | Definition, translation, context shown    |

### Rate Your Answer

| Step | Action                | Expected Result                     |
| ---- | --------------------- | ----------------------------------- |
| 1    | View rating buttons   | Wrong(1), Hard(3), Good(4), Easy(5) |
| 2    | Click rating button   | Rating recorded                     |
| 3    | Card advances to next | Next card appears                   |

### Navigation

| Step | Action             | Expected Result          |
| ---- | ------------------ | ------------------------ |
| 1    | Click **Previous** | Go to previous card      |
| 2    | Click **Next**     | Go to next card          |
| 3    | Click **Reset**    | Card flips back to front |
| 4    | Press arrow keys   | Navigate between cards   |

### Keyboard Shortcuts

| Key                | Action        |
| ------------------ | ------------- |
| `Space` or `Enter` | Flip card     |
| `1`                | Rate as Wrong |
| `2`                | Rate as Hard  |
| `3`                | Rate as Good  |
| `4`                | Rate as Good  |
| `5`                | Rate as Easy  |
| `Left Arrow`       | Previous card |
| `Right Arrow`      | Next card     |
| `H`                | Toggle hint   |

**Test Cases:**

- [ ] Flip card with click - should animate flip
- [ ] Flip card with Space - should animate flip
- [ ] Rate as Easy - should advance and record
- [ ] Navigate with arrows - should move between cards
- [ ] Complete all cards - should show summary

---

## Dashboard & Progress

### Location

**URL:** https://describe-it-lovat.vercel.app/dashboard

### Dashboard Overview

| Step | Action                   | Expected Result                     |
| ---- | ------------------------ | ----------------------------------- |
| 1    | Navigate to `/dashboard` | Dashboard loads                     |
| 2    | View statistics widgets  | Total words, streak, accuracy shown |
| 3    | View progress chart      | Visual progress over time           |
| 4    | View recent activity     | List of recent actions              |
| 5    | View performance metrics | Learning analytics                  |

### Statistics Widgets

| Widget              | Shows                              |
| ------------------- | ---------------------------------- |
| **Total Words**     | Number of vocabulary items learned |
| **Learning Streak** | Consecutive days of practice       |
| **Accuracy Rate**   | Percentage of correct answers      |
| **Time Spent**      | Total learning time                |
| **Words Due**       | Items due for review               |

### Progress Tracking

| Step | Action                     | Expected Result                |
| ---- | -------------------------- | ------------------------------ |
| 1    | View progress chart        | Graph shows learning over time |
| 2    | Hover over data points     | Detailed info for that day     |
| 3    | Change time range          | Weekly/Monthly/All Time        |
| 4    | View breakdown by category | Pie chart of word types        |

**Test Cases:**

- [ ] New user dashboard - should show zeros/empty state
- [ ] After learning session - stats should update
- [ ] After completing flashcards - streak should update
- [ ] Progress chart - should render correctly

---

## Settings & Configuration

### Location

**Access:** Click gear icon (top right) on https://describe-it-lovat.vercel.app

### General Settings

| Step | Action                 | Expected Result                |
| ---- | ---------------------- | ------------------------------ |
| 1    | Open Settings modal    | Settings interface loads       |
| 2    | Go to **General** tab  | General options shown          |
| 3    | Set Primary Language   | Dropdown selection             |
| 4    | Set Secondary Language | Dropdown selection             |
| 5    | Set Learning Direction | Primary→Secondary, etc.        |
| 6    | Set Difficulty Level   | Beginner/Intermediate/Advanced |
| 7    | Click **Save**         | Settings saved                 |

### Appearance Settings

| Step | Action                   | Expected Result           |
| ---- | ------------------------ | ------------------------- |
| 1    | Go to **Appearance** tab | Appearance options shown  |
| 2    | Toggle Dark Mode         | Theme changes immediately |
| 3    | Adjust Font Size         | Text size updates         |
| 4    | Toggle Animations        | Animations on/off         |

### API Key Management

| Step | Action                  | Expected Result          |
| ---- | ----------------------- | ------------------------ |
| 1    | Go to **API Keys** tab  | Key management shown     |
| 2    | Click **Add API Key**   | Input field appears      |
| 3    | Enter Anthropic API key | Key masked as dots       |
| 4    | Click **Validate**      | Key tested, status shown |
| 5    | Click **Save**          | Key saved securely       |

**API Key Test Cases:**

- [ ] Valid API key - should show "Valid" status
- [ ] Invalid API key - should show "Invalid" error
- [ ] No API key - should prompt to add one
- [ ] Delete API key - should remove and clear

### Notification Settings

| Step | Action                      | Expected Result      |
| ---- | --------------------------- | -------------------- |
| 1    | Go to **Notifications** tab | Notification options |
| 2    | Toggle Push Notifications   | On/Off               |
| 3    | Set Reminder Frequency      | Daily/Weekly/Never   |
| 4    | Toggle Email Notifications  | On/Off               |

### Privacy Settings

| Step | Action                   | Expected Result            |
| ---- | ------------------------ | -------------------------- |
| 1    | Go to **Privacy** tab    | Privacy options            |
| 2    | Toggle Analytics         | Data collection on/off     |
| 3    | Toggle Progress Sharing  | Share stats on/off         |
| 4    | Click **Export My Data** | Download personal data     |
| 5    | Click **Delete My Data** | Confirmation, data deleted |

---

## Export & Import

### Location

**Access:** Settings → Export or Dashboard → Export

### Export Vocabulary

| Step | Action                    | Expected Result                    |
| ---- | ------------------------- | ---------------------------------- |
| 1    | Click **Export** button   | Export modal opens                 |
| 2    | Select content type       | Vocabulary/Phrases/Q&A/All         |
| 3    | Select format             | PDF/CSV/JSON/TXT/Anki/Quizlet      |
| 4    | Apply filters (optional)  | Difficulty, date range, categories |
| 5    | Click **Generate Export** | Processing indicator               |
| 6    | Download file             | File downloads automatically       |

### Export Formats

| Format      | Best For           | Contents                  |
| ----------- | ------------------ | ------------------------- |
| **PDF**     | Printing, sharing  | Formatted document        |
| **CSV**     | Spreadsheets       | Comma-separated data      |
| **JSON**    | Backup, developers | Structured data           |
| **TXT**     | Simple lists       | Plain text                |
| **Anki**    | Anki import        | .apkg flashcard deck      |
| **Quizlet** | Quizlet import     | Quizlet-compatible format |

**Test Cases:**

- [ ] Export as PDF - should generate readable PDF
- [ ] Export as CSV - should open in Excel/Sheets
- [ ] Export as Anki - should import into Anki
- [ ] Export with filters - should only include filtered items
- [ ] Export empty collection - should show "Nothing to export"

---

## Keyboard Shortcuts

### Global Shortcuts

| Shortcut   | Action            |
| ---------- | ----------------- |
| `Ctrl + K` | Open search       |
| `Ctrl + ,` | Open settings     |
| `Escape`   | Close modal/panel |

### Image Search

| Shortcut         | Action           |
| ---------------- | ---------------- |
| `Enter`          | Execute search   |
| `Arrow Keys`     | Navigate results |
| `Enter` on image | Select image     |

### Flashcards

| Shortcut          | Action        |
| ----------------- | ------------- |
| `Space` / `Enter` | Flip card     |
| `1-5`             | Rate answer   |
| `Left Arrow`      | Previous card |
| `Right Arrow`     | Next card     |
| `H`               | Toggle hint   |

### Q&A

| Shortcut | Action            |
| -------- | ----------------- |
| `1-4`    | Select answer A-D |
| `Enter`  | Submit answer     |
| `N`      | Next question     |
| `P`      | Previous question |

---

## Troubleshooting

### Common Issues

#### "No API Key" Error

**Symptom:** Cannot generate descriptions or Q&A
**Solution:**

1. Open Settings (gear icon)
2. Go to API Keys tab
3. Enter your Anthropic API key
4. Click Validate, then Save

#### Buttons Not Working

**Symptom:** Clicking buttons has no effect
**Solution:**

1. Hard refresh the page (Ctrl+Shift+R)
2. Clear browser cache
3. Check browser console for errors
4. Try different browser

#### Images Not Loading

**Symptom:** Image search returns blank grid
**Solution:**

1. Check internet connection
2. Verify Unsplash API is accessible
3. Try searching different keywords
4. Check browser ad-blocker settings

#### Description Generation Fails

**Symptom:** "Error generating description"
**Solution:**

1. Verify API key is valid
2. Check if image URL is accessible
3. Try different image
4. Wait 30 seconds and retry

#### Audio Not Playing

**Symptom:** Pronunciation button silent
**Solution:**

1. Check browser audio permissions
2. Verify device volume
3. Try different browser
4. Check if Speech Synthesis is supported

### Error Messages

| Error                 | Meaning           | Fix                    |
| --------------------- | ----------------- | ---------------------- |
| "Invalid API Key"     | API key rejected  | Re-enter correct key   |
| "Rate limit exceeded" | Too many requests | Wait 1 minute          |
| "Network error"       | Connection failed | Check internet         |
| "Session expired"     | Login timed out   | Sign in again          |
| "Image not found"     | Broken image URL  | Select different image |

### Browser Compatibility

| Browser     | Status          | Notes              |
| ----------- | --------------- | ------------------ |
| Chrome 90+  | Fully Supported | Recommended        |
| Firefox 88+ | Fully Supported | -                  |
| Safari 14+  | Fully Supported | -                  |
| Edge 90+    | Fully Supported | -                  |
| Opera 76+   | Fully Supported | -                  |
| IE 11       | Not Supported   | Use modern browser |

### Contact Support

If issues persist:

1. Check browser console (F12 → Console)
2. Screenshot any error messages
3. Note steps to reproduce
4. Report issue with details

---

## Testing Checklist

### New User Journey

- [ ] Homepage loads correctly
- [ ] Can search for images
- [ ] Can select an image
- [ ] Can generate descriptions (all 5 styles)
- [ ] Can start Q&A session
- [ ] Can answer questions and see feedback
- [ ] Can extract vocabulary
- [ ] Can review with flashcards
- [ ] Can save vocabulary items
- [ ] Can export data

### Authentication

- [ ] Can create new account
- [ ] Can sign in with existing account
- [ ] Can reset password
- [ ] Can sign out
- [ ] Session persists on refresh

### Settings

- [ ] Can add/validate API key
- [ ] Can toggle dark mode
- [ ] Can change language preferences
- [ ] Settings persist on refresh

### Performance

- [ ] Page loads under 3 seconds
- [ ] No console errors
- [ ] Animations are smooth
- [ ] Mobile responsive

---

_End of User Testing Guide_
