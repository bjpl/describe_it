# Component Testing Guide

## Overview

This guide provides comprehensive instructions for writing effective component tests using React Testing Library, Jest, and our custom testing utilities.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Testing Philosophy](#testing-philosophy)
3. [Test Structure](#test-structure)
4. [Common Patterns](#common-patterns)
5. [Best Practices](#best-practices)
6. [Examples](#examples)
7. [Troubleshooting](#troubleshooting)

## Getting Started

### Installation

All testing dependencies are already installed in the project:

```bash
npm test                    # Run all tests
npm test -- --watch        # Run tests in watch mode
npm test -- --coverage     # Run tests with coverage
```

### Import Test Utilities

```typescript
import {
  renderWithProviders,
  renderWithAuth,
  screen,
  userEvent,
  waitFor,
} from '@/tests/components/__utils__/test-utils';

import {
  createMockUser,
  createMockDescription,
} from '@/tests/components/__utils__/mock-data';

import {
  expectLoadingState,
  expectErrorMessage,
} from '@/tests/components/__utils__/assertions';
```

## Testing Philosophy

We follow the React Testing Library guiding principle:

> "The more your tests resemble the way your software is used, the more confidence they can give you."

### Key Principles

1. **Test User Behavior**: Focus on what users see and do, not implementation details
2. **Accessibility First**: Use semantic queries (getByRole, getByLabelText)
3. **Avoid Implementation Details**: Don't test component internals
4. **Test Outputs**: Test what the component renders, not how it renders it

## Test Structure

### Basic Test File Structure

```typescript
import { renderWithProviders, screen, userEvent } from '@/tests/components/__utils__/test-utils';
import { MyComponent } from '@/components/MyComponent';
import { createMockUser } from '@/tests/components/__utils__/mock-data';

describe('MyComponent', () => {
  // Setup
  beforeEach(() => {
    // Common setup
  });

  afterEach(() => {
    // Cleanup
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with required props', () => {
      // Test basic rendering
    });

    it('should render loading state', () => {
      // Test loading
    });
  });

  describe('User Interactions', () => {
    it('should handle button click', async () => {
      // Test interactions
    });
  });

  describe('Edge Cases', () => {
    it('should handle error state', () => {
      // Test errors
    });
  });
});
```

### Organize Tests by Feature

```typescript
describe('LoginForm', () => {
  describe('Initial Render', () => {
    it('displays email and password fields');
    it('displays submit button');
    it('displays link to signup');
  });

  describe('Validation', () => {
    it('shows error for invalid email');
    it('shows error for short password');
    it('shows multiple errors simultaneously');
  });

  describe('Submission', () => {
    it('calls onSubmit with form data');
    it('shows loading state during submission');
    it('handles submission errors');
    it('redirects on successful login');
  });
});
```

## Common Patterns

### 1. Rendering Components

```typescript
// Basic rendering
it('should render the component', () => {
  renderWithProviders(<MyComponent />);
  expect(screen.getByText('Hello World')).toBeInTheDocument();
});

// With props
it('should render with custom props', () => {
  renderWithProviders(<MyComponent title="Custom Title" />);
  expect(screen.getByText('Custom Title')).toBeInTheDocument();
});

// With providers
it('should render with authentication', () => {
  const user = createMockUser();
  renderWithAuth(<MyComponent />, { user });
  expect(screen.getByText(user.name)).toBeInTheDocument();
});
```

### 2. Testing User Interactions

```typescript
it('should handle button click', async () => {
  const user = userEvent.setup();
  const handleClick = jest.fn();

  renderWithProviders(<Button onClick={handleClick}>Click Me</Button>);

  await user.click(screen.getByRole('button', { name: /click me/i }));

  expect(handleClick).toHaveBeenCalledTimes(1);
});

it('should handle form submission', async () => {
  const user = userEvent.setup();
  const handleSubmit = jest.fn();

  renderWithProviders(<Form onSubmit={handleSubmit} />);

  await user.type(screen.getByLabelText(/email/i), 'test@example.com');
  await user.type(screen.getByLabelText(/password/i), 'password123');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  await waitFor(() => {
    expect(handleSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });
});
```

### 3. Testing Async Behavior

```typescript
it('should load and display data', async () => {
  const mockData = createMockDescription();

  // Mock API call
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => mockData,
  });

  renderWithProviders(<DataComponent />);

  // Check loading state
  expect(screen.getByText(/loading/i)).toBeInTheDocument();

  // Wait for data to load
  await waitFor(() => {
    expect(screen.getByText(mockData.title)).toBeInTheDocument();
  });

  // Verify loading state is gone
  expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
});
```

### 4. Testing Error States

```typescript
it('should display error message on failure', async () => {
  const errorMessage = 'Failed to load data';

  global.fetch = jest.fn().mockRejectedValue(new Error(errorMessage));

  renderWithProviders(<DataComponent />);

  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent(errorMessage);
  });
});
```

### 5. Testing Conditional Rendering

```typescript
it('should show login button when not authenticated', () => {
  renderWithProviders(<Header />);
  expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
});

it('should show user menu when authenticated', () => {
  const user = createMockUser();
  renderWithAuth(<Header />, { user });

  expect(screen.queryByRole('button', { name: /login/i })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /profile/i })).toBeInTheDocument();
});
```

## Best Practices

### 1. Use Semantic Queries

**Priority Order:**
1. `getByRole` - Most accessible
2. `getByLabelText` - Form elements
3. `getByPlaceholderText` - Form inputs
4. `getByText` - Non-interactive elements
5. `getByTestId` - Last resort

```typescript
// Good
screen.getByRole('button', { name: /submit/i });
screen.getByLabelText(/email/i);

// Avoid
screen.getByTestId('submit-button');
```

### 2. Test User Behavior, Not Implementation

```typescript
// Good - Tests behavior
it('should add item to cart', async () => {
  const user = userEvent.setup();
  renderWithProviders(<ProductCard product={mockProduct} />);

  await user.click(screen.getByRole('button', { name: /add to cart/i }));

  expect(screen.getByText(/added to cart/i)).toBeInTheDocument();
});

// Bad - Tests implementation
it('should call addToCart function', () => {
  const addToCart = jest.fn();
  renderWithProviders(<ProductCard onAddToCart={addToCart} />);

  // This tests the prop, not the user experience
  expect(addToCart).toBeDefined();
});
```

### 3. Use waitFor for Async Updates

```typescript
it('should update after async operation', async () => {
  const user = userEvent.setup();
  renderWithProviders(<AsyncComponent />);

  await user.click(screen.getByRole('button', { name: /load/i }));

  // Wait for the update
  await waitFor(() => {
    expect(screen.getByText(/loaded/i)).toBeInTheDocument();
  });
});
```

### 4. Clean Up After Tests

```typescript
afterEach(() => {
  jest.clearAllMocks();
  cleanup();
  window.localStorage.clear();
});
```

### 5. Group Related Tests

```typescript
describe('UserProfile', () => {
  describe('when user is loading', () => {
    it('shows loading spinner');
    it('disables edit button');
  });

  describe('when user is loaded', () => {
    it('displays user information');
    it('enables edit button');
  });

  describe('when editing', () => {
    it('shows form fields');
    it('saves changes on submit');
  });
});
```

## Examples

### Example 1: Testing a Button Component

```typescript
import { renderWithProviders, screen, userEvent } from '@/tests/components/__utils__/test-utils';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('should render children', () => {
    renderWithProviders(<Button>Click Me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('should handle click events', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();

    renderWithProviders(<Button onClick={handleClick}>Click</Button>);
    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when loading', () => {
    renderWithProviders(<Button loading>Submit</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should apply variant styles', () => {
    renderWithProviders(<Button variant="primary">Primary</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('btn-primary');
  });
});
```

### Example 2: Testing a Form Component

```typescript
import { renderWithProviders, screen, userEvent, waitFor } from '@/tests/components/__utils__/test-utils';
import { ContactForm } from '@/components/ContactForm';

describe('ContactForm', () => {
  it('should validate required fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/message is required/i)).toBeInTheDocument();
  });

  it('should submit form with valid data', async () => {
    const user = userEvent.setup();
    const handleSubmit = jest.fn();

    renderWithProviders(<ContactForm onSubmit={handleSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/message/i), 'Hello world');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        message: 'Hello world',
      });
    });
  });

  it('should show success message after submission', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/message/i), 'Hello');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/message sent successfully/i)).toBeInTheDocument();
    });
  });
});
```

### Example 3: Testing a List Component

```typescript
import { renderWithProviders, screen } from '@/tests/components/__utils__/test-utils';
import { UserList } from '@/components/UserList';
import { createMockUser } from '@/tests/components/__utils__/mock-data';

describe('UserList', () => {
  it('should render empty state', () => {
    renderWithProviders(<UserList users={[]} />);
    expect(screen.getByText(/no users found/i)).toBeInTheDocument();
  });

  it('should render list of users', () => {
    const users = [
      createMockUser({ id: '1', name: 'User 1' }),
      createMockUser({ id: '2', name: 'User 2' }),
      createMockUser({ id: '3', name: 'User 3' }),
    ];

    renderWithProviders(<UserList users={users} />);

    expect(screen.getByText('User 1')).toBeInTheDocument();
    expect(screen.getByText('User 2')).toBeInTheDocument();
    expect(screen.getByText('User 3')).toBeInTheDocument();
  });

  it('should handle user click', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();
    const users = [createMockUser({ id: '1', name: 'User 1' })];

    renderWithProviders(<UserList users={users} onUserClick={handleClick} />);

    await user.click(screen.getByText('User 1'));

    expect(handleClick).toHaveBeenCalledWith(users[0]);
  });
});
```

## Troubleshooting

### Common Issues

#### 1. "Unable to find element"

```typescript
// Problem: Element not found
screen.getByText('Submit');

// Solution: Use more flexible matchers
screen.getByText(/submit/i);  // Case insensitive
screen.getByRole('button', { name: /submit/i });
```

#### 2. "Found multiple elements"

```typescript
// Problem: Multiple matches
screen.getByRole('button');

// Solution: Be more specific
screen.getByRole('button', { name: /submit/i });
```

#### 3. "Component did not update"

```typescript
// Problem: Missing waitFor
await user.click(button);
expect(screen.getByText('Updated')).toBeInTheDocument(); // Fails

// Solution: Wait for updates
await user.click(button);
await waitFor(() => {
  expect(screen.getByText('Updated')).toBeInTheDocument();
});
```

#### 4. "Act warning"

```typescript
// Problem: State updates outside act()
renderWithProviders(<AsyncComponent />);

// Solution: Wait for updates
renderWithProviders(<AsyncComponent />);
await waitFor(() => {
  expect(screen.getByText(/loaded/i)).toBeInTheDocument();
});
```

### Debugging Tips

```typescript
// View rendered output
import { debug } from '@testing-library/react';
const { debug } = renderWithProviders(<MyComponent />);
debug(); // Prints DOM to console

// View specific element
const element = screen.getByRole('button');
debug(element);

// Use screen.logTestingPlaygroundURL()
screen.logTestingPlaygroundURL(); // Opens testing playground
```

## Resources

- [React Testing Library Docs](https://testing-library.com/react)
- [Jest Documentation](https://jestjs.io/)
- [Common Mistakes with RTL](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Testing Playground](https://testing-playground.com/)
