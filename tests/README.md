# Test Suite Documentation

This comprehensive test suite provides 80%+ coverage across all critical components of the Describe It application.

## Test Structure

### 📁 Directory Structure
```
tests/
├── setup.ts                     # Test configuration and global mocks
├── utils/
│   └── test-utils.tsx           # Custom testing utilities and helpers
├── unit/
│   ├── components/              # Component unit tests
│   │   ├── EnhancedQASystem.test.tsx
│   │   ├── EnhancedVocabularyPanel.test.tsx
│   │   └── ImageSearch.test.tsx
│   ├── hooks/                   # Custom hook tests
│   │   ├── useImageSearch.test.ts
│   │   └── useDescriptions.test.ts
│   └── store/                   # State management tests
│       └── app-store.test.ts
├── integration/
│   └── api/                     # API integration tests
│       └── all-endpoints.test.ts
├── security/
│   └── api-security.test.ts     # Security vulnerability tests
└── performance/
    └── performance.test.ts      # Performance and optimization tests
```

## Test Categories

### 🧪 Unit Tests
- **Component Tests**: Test individual React components in isolation
- **Hook Tests**: Test custom React hooks with comprehensive scenarios  
- **Store Tests**: Test Zustand state management with all operations
- **Utilities Tests**: Test helper functions and utility modules

### 🔗 Integration Tests
- **API Tests**: Test all API endpoints with various scenarios
- **Component Integration**: Test component interactions and data flow
- **Service Integration**: Test third-party service integrations

### 🔒 Security Tests
- **Input Validation**: SQL injection, XSS, command injection prevention
- **Authentication**: API key validation and security headers
- **Authorization**: Access control and permission checks
- **Data Protection**: Sensitive data handling and error disclosure

### ⚡ Performance Tests
- **Rendering Performance**: Component render time optimization
- **API Performance**: Request/response time measurements
- **Memory Management**: Memory leak detection and cleanup
- **Bundle Performance**: Code splitting and lazy loading

## Coverage Requirements

The test suite maintains minimum coverage thresholds:

- **Statements**: 80%
- **Branches**: 75%  
- **Functions**: 80%
- **Lines**: 80%

## Test Utilities

### Mock Factories
```typescript
// Image mock factory
export const mockImage = (overrides = {}) => ({
  id: 'test-image-id',
  urls: { regular: 'https://example.com/image.jpg' },
  alt_description: 'Test image',
  // ... other properties
  ...overrides
});

// API response mock
export const createMockApiResponse = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data
});
```

### Testing Helpers
```typescript
// Performance measurement
export const measureRenderTime = async (renderFn) => {
  const start = performance.now();
  renderFn();
  return performance.now() - start;
};

// Accessibility checking
export const checkAccessibility = (container) => {
  // Validates ARIA labels, heading hierarchy, etc.
};

// Form testing utilities
export const fillForm = async (user, formData) => {
  // Fills form fields with test data
};
```

## Running Tests

### Available Commands
```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run E2E tests
npm run test:e2e

# Run performance tests
npm run test:perf
```

### CI/CD Integration
Tests are configured to run automatically in CI/CD pipelines with:
- Coverage reporting
- Performance benchmarking
- Security scanning
- Accessibility validation

## Test Configuration

### Environment Setup
- **JSDOM**: Browser-like environment for React component testing
- **MSW**: Mock Service Worker for API mocking
- **Vitest**: Fast test runner with TypeScript support
- **Testing Library**: React component testing utilities

### Global Mocks
- Next.js navigation and routing
- Framer Motion animations
- Lucide React icons
- Browser APIs (localStorage, ResizeObserver, etc.)
- Third-party services (OpenAI, Unsplash)

## Best Practices

### ✅ Do
- Write descriptive test names that explain the "what" and "why"
- Use the AAA pattern: Arrange, Act, Assert
- Mock external dependencies to isolate units under test
- Test both happy paths and error scenarios
- Include accessibility checks in component tests
- Measure and assert on performance characteristics

### ❌ Don't
- Write tests that depend on other tests
- Mock implementation details instead of interfaces
- Ignore edge cases and error conditions
- Skip performance and security tests
- Test implementation details instead of behavior

## Contributing

When adding new features:

1. **Write tests first** (TDD approach)
2. **Maintain coverage** above 80% thresholds
3. **Include security tests** for new endpoints
4. **Add performance tests** for critical paths
5. **Update documentation** for new test utilities

## Debugging Tests

### Common Issues
- **Import errors**: Check path aliases and module resolution
- **Mock issues**: Verify mocks are properly configured in setup.ts
- **Async issues**: Use proper async/await and waitFor utilities
- **Component errors**: Check for proper cleanup and provider setup

### Debug Commands
```bash
# Debug specific test
npm run test -- --reporter=verbose specific-test.test.ts

# Debug with browser
npm run test:ui

# Debug coverage
npm run test:coverage -- --reporter=html
```

## Test Data

### Mock Data Location
Test data and fixtures are located in:
- `tests/utils/test-utils.tsx` - Common mock factories
- Individual test files - Specific test data

### API Mocking
API responses are mocked using fetch mocks with realistic data structures that match production API contracts.

## Security Testing

The security test suite covers:
- Input validation and sanitization
- Authentication and authorization
- Rate limiting and DOS protection  
- Data exposure and information leakage
- CORS and security headers
- Dependency vulnerabilities

## Performance Testing

Performance tests validate:
- Component rendering times < 100ms
- API response times < 5s for complex operations
- Memory usage and leak prevention
- Bundle size and loading performance
- Animation and interaction responsiveness

This comprehensive test suite ensures the application is reliable, secure, performant, and maintainable.