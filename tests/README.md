# Spanish Learning App - Test Suite Documentation

## Overview

This comprehensive test suite ensures the reliability, performance, and accessibility of the Spanish Learning App. The testing strategy follows the testing pyramid approach with extensive coverage across unit, integration, and end-to-end tests.

## Testing Strategy

### 1. Test Types

#### Unit Tests (80% of tests)
- **Location**: `tests/unit/`
- **Framework**: Vitest + React Testing Library
- **Coverage**: Individual components, hooks, utilities, and API routes
- **Focus**: Business logic, component behavior, error handling

#### Integration Tests (15% of tests)
- **Location**: `tests/unit/api/`
- **Framework**: Vitest with MSW (Mock Service Worker)
- **Coverage**: API endpoints, service integrations, data flow
- **Focus**: Component interactions, API contracts

#### End-to-End Tests (5% of tests)
- **Location**: `tests/e2e/`
- **Framework**: Playwright
- **Coverage**: Critical user journeys and workflows
- **Focus**: Real user interactions, cross-browser compatibility

### 2. Testing Pyramid Structure

```
         /\
        /E2E\      <- Critical user flows (Playwright)
       /------\
      /  API  \    <- API routes & integrations (Vitest + MSW)
     /--------\
    /   Unit   \   <- Components, hooks, utils (Vitest + RTL)
   /------------\
```

## Test Coverage Goals

- **Overall Coverage**: 80%+
- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

## Key Testing Areas

### 1. Image Search Functionality
- Search query handling and validation
- Result pagination and infinite scroll
- Filtering and sorting capabilities
- Error handling (network issues, rate limits)
- Empty state management
- Performance with large datasets

### 2. Description Generation
- Multiple description styles (narrativo, poetico, academico, conversacional, infantil)
- Language support (Spanish/English)
- Custom prompts and advanced options
- Regeneration and editing capabilities
- Error handling and retry mechanisms
- Caching and performance optimization

### 3. Phrase Extraction
- Text processing and phrase identification
- Category classification (nouns, verbs, adjectives, phrases, idioms)
- Difficulty level assessment
- Translation accuracy
- Search and filtering functionality
- Phrase bank management

### 4. Question/Answer Generation
- Question difficulty levels (facil, medio, dificil)
- Category-based organization
- Interactive Q&A practice mode
- Progress tracking and scoring
- Export functionality
- Personalized learning paths

### 5. Cross-cutting Concerns
- Authentication and session management
- Error boundaries and graceful degradation
- Accessibility (WCAG 2.1 AA compliance)
- Performance optimization
- Mobile responsiveness
- Internationalization

## Test Files Structure

```
tests/
├── setup.ts                 # Global test configuration
├── utils/
│   └── test-helpers.ts      # Reusable test utilities
├── mocks/
│   └── server.ts           # MSW API mocks
├── unit/
│   ├── components/         # Component tests
│   │   ├── ImageSearch.test.tsx
│   │   ├── DescriptionTabs.test.tsx
│   │   ├── PhraseExtractor.test.tsx
│   │   └── QuestionAnswerPanel.test.tsx
│   ├── hooks/              # Custom hooks tests
│   │   ├── useImageSearch.test.ts
│   │   ├── useDescriptions.test.ts
│   │   ├── usePhraseExtraction.test.ts
│   │   └── useQuestionAnswer.test.ts
│   ├── api/                # API route tests
│   │   ├── images.test.ts
│   │   ├── descriptions.test.ts
│   │   ├── phrases.test.ts
│   │   └── qa.test.ts
│   └── utils/              # Utility function tests
│       └── performance.test.ts
└── e2e/                    # End-to-end tests
    ├── image-search.spec.ts
    ├── description-generation.spec.ts
    ├── phrase-extraction.spec.ts
    └── qa-generation.spec.ts
```

## Running Tests

### Prerequisites
```bash
npm install
```

### Unit Tests
```bash
# Run all unit tests
npm run test

# Run with coverage
npm run test -- --coverage

# Run in watch mode
npm run test -- --watch

# Run specific test file
npm run test -- ImageSearch.test.tsx

# Run tests matching pattern
npm run test -- --grep="search functionality"
```

### End-to-End Tests
```bash
# Run all E2E tests
npm run test:e2e

# Run in headed mode (see browser)
npm run test:e2e -- --headed

# Run specific browser
npm run test:e2e -- --project=chromium

# Run specific test file
npm run test:e2e -- image-search.spec.ts

# Debug mode
npm run test:e2e -- --debug
```

### Coverage Analysis
```bash
# Generate coverage report
npm run test -- --coverage

# View HTML coverage report
open coverage/index.html
```

## Test Configuration

### Vitest Configuration (`vitest.config.ts`)
- **Environment**: jsdom for React components
- **Setup**: Global test setup with mocks and utilities
- **Coverage**: Comprehensive reporting with thresholds
- **Timeout**: 10 seconds for async operations

### Playwright Configuration (`playwright.config.ts`)
- **Browsers**: Chromium, Firefox, WebKit
- **Mobile**: Pixel 5, iPhone 12 viewports
- **Base URL**: http://localhost:3000
- **Retries**: 2 on CI, 0 locally
- **Screenshots**: On failure
- **Traces**: On retry

## Mock Strategy

### API Mocking with MSW
- **Image Search API**: Unsplash-like responses
- **Description Generation**: OpenAI-like responses
- **Phrase Extraction**: NLP-like responses
- **Q&A Generation**: Educational content responses

### Component Mocking
- **Framer Motion**: Simple div replacements for animations
- **Next.js Navigation**: Mocked hooks and functions
- **Web APIs**: Speech Synthesis, Local Storage, etc.

## Test Data Management

### Mock Data Generators
```typescript
// Create consistent test images
const mockImage = createMockImage('test-1', {
  alt_description: 'Custom description',
  user: { name: 'Test Photographer' }
});

// Generate large datasets for performance testing
const largeDataset = createLargeDataset(1000);
```

### Test Utilities
- **Query Client Wrapper**: Consistent React Query setup
- **Store Mocking**: Zustand store state management
- **Performance Measurement**: Execution time tracking
- **Memory Leak Detection**: Memory usage monitoring

## Accessibility Testing

### Manual Checks
- Keyboard navigation order
- Screen reader compatibility
- Focus management
- Color contrast ratios
- ARIA labels and descriptions

### Automated Checks
```typescript
// Focus order validation
await checkFocusOrder(page, [
  'search input',
  'filters button',
  'first image',
  'generate description'
]);

// ARIA label validation
await checkAriaLabels(page, [
  'input[type="text"]',
  'button[role="button"]',
  'img[role="img"]'
]);
```

## Performance Testing

### Benchmarks
- **Image Search**: < 200ms response time
- **Description Generation**: < 2s for single description
- **Phrase Extraction**: < 1s for typical text length
- **UI Rendering**: < 100ms for component updates

### Memory Management
- **Memory Leaks**: < 5MB increase over baseline
- **Cache Cleanup**: Efficient React Query cache management
- **Large Datasets**: Graceful handling of 1000+ items

## Continuous Integration

### GitHub Actions Workflow
```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test -- --coverage
      
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
```

## Test-Driven Development (TDD)

### Red-Green-Refactor Cycle
1. **Red**: Write failing test for new feature
2. **Green**: Write minimal code to make test pass
3. **Refactor**: Improve code while keeping tests green

### Example TDD Flow
```typescript
// 1. Red - Write failing test
describe('ImageSearch', () => {
  it('should filter images by orientation', () => {
    // Test implementation
    expect(filteredImages).toHaveLength(5);
  });
});

// 2. Green - Implement feature
const filterByOrientation = (images, orientation) => {
  return images.filter(img => img.orientation === orientation);
};

// 3. Refactor - Improve implementation
const filterByOrientation = useMemo(() => {
  return (images, orientation) => 
    images.filter(img => img.orientation === orientation);
}, []);
```

## Debugging Tests

### Common Issues
1. **Timing Issues**: Use proper async/await and waitFor
2. **Mock Problems**: Ensure mocks are reset between tests
3. **DOM Cleanup**: Use cleanup functions and fresh renders
4. **State Pollution**: Isolate test state and use fresh instances

### Debug Tools
```bash
# Run single test with debug output
npm run test -- --verbose ImageSearch.test.tsx

# Debug E2E tests
npm run test:e2e -- --debug --headed

# Visual debugging with screenshots
npm run test:e2e -- --screenshot=on
```

## Best Practices

### Test Organization
- Group related tests with `describe` blocks
- Use descriptive test names that explain behavior
- Follow AAA pattern: Arrange, Act, Assert
- Keep tests independent and isolated

### Assertions
- Use specific matchers for better error messages
- Test behavior, not implementation details
- Verify both positive and negative cases
- Include edge cases and error conditions

### Maintainability
- Extract common setup into helper functions
- Use Page Object Model for E2E tests
- Keep tests simple and focused
- Update tests when requirements change

## Edge Cases & Error Scenarios

### Network Conditions
- Offline functionality
- Slow network responses
- Intermittent connectivity
- Rate limiting and throttling

### Data Edge Cases
- Empty search results
- Malformed API responses
- Very large datasets
- Special characters and Unicode

### User Interactions
- Rapid consecutive actions
- Invalid input combinations
- Browser back/forward navigation
- Page refresh during operations

## Security Testing

### Input Validation
- SQL injection prevention
- XSS attack mitigation
- CSRF protection
- Input sanitization

### Authentication
- Session management
- Token validation
- Access control
- Logout scenarios

## Conclusion

This comprehensive test suite ensures the Spanish Learning App delivers a reliable, performant, and accessible experience for users learning Spanish through image-based content. The multi-layered testing approach provides confidence in code quality while supporting continuous development and feature enhancement.

Regular maintenance and updates to the test suite ensure it remains effective as the application evolves. New features should always include corresponding tests, and test failures should be addressed promptly to maintain the integrity of the testing safety net.