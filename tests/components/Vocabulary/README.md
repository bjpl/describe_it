# VocabularyCard Component Tests

## Quick Start

### Run All Tests
```bash
npm test -- tests/components/Vocabulary/VocabularyCard.test.tsx
```

### Run Tests in Watch Mode
```bash
npm test -- tests/components/Vocabulary/VocabularyCard.test.tsx --watch
```

### Run with Coverage
```bash
npm test -- tests/components/Vocabulary/VocabularyCard.test.tsx --coverage
```

### Run Specific Test Suite
```bash
npm test -- tests/components/Vocabulary/VocabularyCard.test.tsx -t "Rendering"
npm test -- tests/components/Vocabulary/VocabularyCard.test.tsx -t "Interactive Elements"
npm test -- tests/components/Vocabulary/VocabularyCard.test.tsx -t "Accessibility"
```

---

## Test Organization

### File Structure
```
tests/components/Vocabulary/
├── VocabularyCard.test.tsx   # 86 comprehensive tests
├── TEST_SUMMARY.md           # Detailed test documentation
└── README.md                 # This file
```

### Component Structure
```
src/components/Vocabulary/
└── VocabularyCard.tsx        # Component implementation
```

---

## Test Categories

1. **Rendering (15 tests)** - Display and layout
2. **Interactive Elements (18 tests)** - Buttons, flip, audio
3. **Progress Indicators (12 tests)** - Mastery bar, review stats
4. **Actions (15 tests)** - User actions and callbacks
5. **Accessibility (10 tests)** - ARIA, keyboard, focus
6. **Edge Cases (10+ tests)** - Error handling, validation
7. **Snapshots (4 tests)** - Visual regression

---

## Key Features Tested

✅ Bilingual card flip (English ↔ Spanish)
✅ Audio pronunciation playback
✅ Favorite/unfavorite toggle
✅ Edit, Delete, Share actions
✅ Mastery level progress (0-100%)
✅ Review statistics (times reviewed, dates)
✅ Custom list management
✅ Issue reporting
✅ Keyboard shortcuts (Space to flip)
✅ Full accessibility compliance

---

## Writing New Tests

### Template for New Test
```typescript
describe('New Feature', () => {
  it('should do something specific', () => {
    // Arrange
    render(<VocabularyCard item={mockVocabularyItem} />);

    // Act
    const button = screen.getByLabelText('Button label');
    fireEvent.click(button);

    // Assert
    expect(screen.getByText('Expected result')).toBeInTheDocument();
  });
});
```

### Using Mock Data
```typescript
import { mockVocabularyItem, mockMinimalItem } from './VocabularyCard.test';
```

### Testing User Interactions
```typescript
// Click events
fireEvent.click(button);

// Input changes
fireEvent.change(input, { target: { value: 'new value' } });

// Keyboard events
fireEvent.keyDown(element, { key: 'Space' });
```

---

## Debugging Tests

### View Test Output
```bash
npm test -- VocabularyCard.test.tsx --reporter=verbose
```

### Debug Single Test
```bash
npm test -- VocabularyCard.test.tsx -t "specific test name"
```

### Update Snapshots
```bash
npm test -- VocabularyCard.test.tsx -u
```

---

## Common Issues

### Test Fails: "Unable to find element"
**Solution**: Check if element is conditionally rendered or has different text

### Test Fails: Date formatting
**Solution**: Use regex matchers like `screen.getByText(/Sep/)`

### Test Fails: Async operations
**Solution**: Use `waitFor()` for async state updates

---

## Maintenance

### When to Update Tests

1. **Component Props Change**: Update mock data and prop tests
2. **New Feature Added**: Add new test suite
3. **UI Changes**: Update snapshots with `-u` flag
4. **Bug Fix**: Add test case for the bug scenario

### Test Coverage Goals

- **Statements**: >90%
- **Branches**: >85%
- **Functions**: >90%
- **Lines**: >90%

---

## CI/CD Integration

### Pre-commit Hook
Tests run automatically before commits via Husky

### GitHub Actions
```yaml
- name: Run VocabularyCard Tests
  run: npm test -- tests/components/Vocabulary/VocabularyCard.test.tsx --run
```

---

## Resources

- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest Documentation](https://vitest.dev/)
- [Accessibility Testing](https://testing-library.com/docs/queries/about/#priority)
- [Component Source](/src/components/Vocabulary/VocabularyCard.tsx)

---

**Maintained by**: Testing & Quality Assurance Team
**Last Updated**: October 3, 2025
