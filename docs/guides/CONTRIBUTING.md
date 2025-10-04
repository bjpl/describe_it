# Contributing to Describe It

Welcome to Describe It! We're excited that you're interested in contributing to our Spanish learning platform. This document provides guidelines and information to help you contribute effectively.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Issue Templates](#issue-templates)
- [Performance Guidelines](#performance-guidelines)
- [Security Guidelines](#security-guidelines)
- [Documentation Standards](#documentation-standards)

## 🤝 Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to [conduct@describe-it.app](mailto:conduct@describe-it.app).

### Our Pledge

We are committed to making participation in this project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 20+** and npm
- **Git**
- **PostgreSQL** (for local database)
- Code editor (VS Code recommended)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/yourusername/describe-it.git
cd describe-it
```

3. Add the upstream repository:

```bash
git remote add upstream https://github.com/originalowner/describe-it.git
```

## 🛠️ Development Environment

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Copy the environment template and configure your local settings:

```bash
cp .env.example .env.local
```

Fill in your environment variables:

```env
# Required for basic functionality
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional - app works in demo mode without these
OPENAI_API_KEY=your_openai_key
UNSPLASH_ACCESS_KEY=your_unsplash_key
```

### 3. Database Setup

Set up your Supabase database:

1. Create a new Supabase project
2. Run the migration files in `src/lib/database/migrations/`
3. Enable Row Level Security on all tables

### 4. Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### 5. Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server

# Testing
npm run test             # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage
npm run test:e2e         # Run end-to-end tests

# Code Quality
npm run lint             # Run ESLint
npm run typecheck        # Run TypeScript checks
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting

# Analysis
npm run analyze          # Analyze bundle size
npm run perf:test        # Run performance tests
```

## 📝 Code Standards

### TypeScript Guidelines

We use TypeScript in strict mode. Follow these guidelines:

#### 1. Type Definitions
```typescript
// ✅ Good: Explicit interface definitions
interface User {
  id: string;
  email: string;
  displayName: string | null;
  preferences: UserPreferences;
}

// ✅ Good: Strict function signatures
async function generateDescription(
  params: DescriptionGenerationParams
): Promise<Description> {
  // Implementation
}

// ❌ Bad: Using 'any' type
function processData(data: any): any {
  // Avoid this
}
```

#### 2. Component Props
```typescript
// ✅ Good: Well-defined props interface
interface ImageViewerProps {
  imageUrl: string;
  alt: string;
  onLoad?: () => void;
  className?: string;
}

export function ImageViewer({ imageUrl, alt, onLoad, className }: ImageViewerProps) {
  // Implementation
}
```

#### 3. API Response Types
```typescript
// Define all API response shapes
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, unknown>;
}

interface DescriptionResponse extends ApiResponse<Description[]> {
  metadata: {
    responseTime: string;
    demoMode: boolean;
  };
}
```

### React Guidelines

#### 1. Component Structure
```typescript
// ✅ Good: Functional component with proper organization
export function ComponentName({ prop1, prop2 }: ComponentNameProps) {
  // 1. Hooks (useState, useEffect, etc.)
  const [state, setState] = useState<StateType>(initialValue);
  const { data, isLoading } = useQuery(queryKey, queryFn);
  
  // 2. Event handlers
  const handleClick = useCallback(() => {
    // Handler implementation
  }, [dependencies]);
  
  // 3. Effects
  useEffect(() => {
    // Side effects
  }, [dependencies]);
  
  // 4. Early returns
  if (isLoading) return <LoadingSpinner />;
  if (!data) return <EmptyState />;
  
  // 5. Render
  return (
    <div className="component-wrapper">
      {/* JSX */}
    </div>
  );
}
```

#### 2. Custom Hooks
```typescript
// ✅ Good: Reusable custom hook
export function useDescriptionGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const generateDescription = useCallback(async (params: GenerationParams) => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate description');
      }
      
      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, []);
  
  return { generateDescription, isGenerating, error };
}
```

### CSS and Styling Guidelines

We use Tailwind CSS with custom utility classes:

#### 1. Component Styling
```tsx
// ✅ Good: Semantic class names and responsive design
<button className={cn(
  "btn-primary", // Base styles
  "hover:bg-blue-600 focus:ring-2 focus:ring-blue-500", // Interactive states
  "sm:px-4 sm:py-2 md:px-6 md:py-3", // Responsive sizing
  disabled && "opacity-50 cursor-not-allowed", // Conditional styles
  className // Allow override
)}>
  {children}
</button>

// Define reusable styles in globals.css
.btn-primary {
  @apply bg-blue-500 text-white px-4 py-2 rounded-md font-medium transition-colors duration-200;
}
```

#### 2. Responsive Design
```tsx
// ✅ Mobile-first responsive approach
<div className={cn(
  "w-full", // Mobile: full width
  "md:w-1/2", // Tablet: half width
  "lg:w-1/3", // Desktop: third width
  "xl:max-w-md" // Large screens: max width
)}>
```

### API Route Guidelines

#### 1. Request Validation
```typescript
// ✅ Good: Use Zod for validation
import { z } from 'zod';

const requestSchema = z.object({
  imageUrl: z.string().url(),
  style: z.enum(['narrativo', 'poetico', 'academico', 'conversacional', 'infantil']),
  maxLength: z.number().int().min(50).max(1000).default(300)
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = requestSchema.parse(body);
    
    // Process validated data
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request parameters',
        details: error.errors
      }, { status: 400 });
    }
    
    // Handle other errors
  }
}
```

#### 2. Error Handling
```typescript
// ✅ Good: Consistent error responses
interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
  timestamp: string;
}

function createErrorResponse(
  message: string, 
  status: number, 
  code?: string, 
  details?: unknown
): NextResponse<ApiError> {
  return NextResponse.json({
    error: message,
    code,
    details,
    timestamp: new Date().toISOString()
  }, { status });
}
```

#### 3. Success Responses
```typescript
// ✅ Good: Consistent success responses
interface ApiSuccess<T> {
  success: true;
  data: T;
  metadata?: Record<string, unknown>;
}

function createSuccessResponse<T>(
  data: T, 
  metadata?: Record<string, unknown>
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata
    }
  });
}
```

## 🧪 Testing Guidelines

### 1. Unit Tests

Write unit tests for all utility functions and custom hooks:

```typescript
// tests/utils/textAnalysis.test.ts
import { describe, it, expect } from 'vitest';
import { extractVocabulary } from '@/utils/textAnalysis';

describe('extractVocabulary', () => {
  it('should extract Spanish nouns correctly', () => {
    const text = 'El gato camina por el jardín hermoso';
    const vocabulary = extractVocabulary(text, 'es');
    
    expect(vocabulary).toContainEqual(
      expect.objectContaining({
        text: 'gato',
        category: 'noun',
        confidence: expect.any(Number)
      })
    );
  });
  
  it('should handle empty text gracefully', () => {
    const vocabulary = extractVocabulary('', 'es');
    expect(vocabulary).toEqual([]);
  });
});
```

### 2. Integration Tests

Test API routes and database interactions:

```typescript
// tests/api/descriptions.test.ts
import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/descriptions/generate/route';

describe('/api/descriptions/generate', () => {
  it('should generate descriptions successfully', async () => {
    const request = new Request('http://localhost/api/descriptions/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: 'https://example.com/image.jpg',
        style: 'narrativo'
      })
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2); // Spanish and English
  });
});
```

### 3. End-to-End Tests

Use Playwright for E2E testing:

```typescript
// tests/e2e/description-flow.spec.ts
import { test, expect } from '@playwright/test';

test('complete description generation flow', async ({ page }) => {
  await page.goto('/');
  
  // Search for an image
  await page.fill('[data-testid="image-search"]', 'sunset');
  await page.click('[data-testid="search-button"]');
  
  // Select first image
  await page.click('[data-testid="image-result"]:first-child');
  
  // Generate description
  await page.selectOption('[data-testid="style-select"]', 'narrativo');
  await page.click('[data-testid="generate-button"]');
  
  // Verify description is generated
  await expect(page.locator('[data-testid="description-content"]')).toBeVisible();
  await expect(page.locator('[data-testid="description-content"]')).toContainText(/\w+/);
});
```

### 4. Component Tests

Test React components with Testing Library:

```typescript
// tests/components/ImageViewer.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { ImageViewer } from '@/components/ImageViewer';

describe('ImageViewer', () => {
  it('renders image with correct alt text', () => {
    render(
      <ImageViewer 
        imageUrl="https://example.com/image.jpg"
        alt="Test image"
      />
    );
    
    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
    expect(image).toHaveAttribute('alt', 'Test image');
  });
  
  it('calls onLoad when image loads', async () => {
    const onLoad = vi.fn();
    
    render(
      <ImageViewer 
        imageUrl="https://example.com/image.jpg"
        alt="Test image"
        onLoad={onLoad}
      />
    );
    
    const image = screen.getByRole('img');
    fireEvent.load(image);
    
    await waitFor(() => {
      expect(onLoad).toHaveBeenCalledTimes(1);
    });
  });
});
```

## 📦 Commit Convention

We use Conventional Commits for clear commit messages:

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools

### Examples

```bash
# Feature
git commit -m "feat(descriptions): add poetic style generation"

# Bug fix
git commit -m "fix(api): handle rate limit errors gracefully"

# Documentation
git commit -m "docs(api): update OpenAPI spec for translation endpoint"

# Performance
git commit -m "perf(images): optimize image loading with lazy loading"

# Breaking change
git commit -m "feat(auth)!: migrate to Supabase v2 auth

BREAKING CHANGE: auth.user is now auth.data.user"
```

## 🔄 Pull Request Process

### 1. Before Submitting

- [ ] Create a feature branch from `main`
- [ ] Write clear, descriptive commit messages
- [ ] Add or update tests for your changes
- [ ] Ensure all tests pass
- [ ] Update documentation if needed
- [ ] Run the linter and fix any issues

### 2. Pull Request Template

When creating a pull request, use this template:

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Screenshots
If applicable, add screenshots to help explain your changes.

## Checklist
- [ ] My code follows the code style of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] Any dependent changes have been merged and published
```

### 3. Review Process

1. **Automated Checks**: All CI checks must pass
2. **Code Review**: At least one maintainer must approve
3. **Testing**: Reviewer will test the functionality
4. **Documentation**: Ensure docs are updated if needed

### 4. Merge Requirements

- [ ] All CI checks pass
- [ ] At least one approved review
- [ ] No conflicts with base branch
- [ ] Branch is up to date with main

## 🐛 Issue Templates

### Bug Report

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
- OS: [e.g. macOS, Windows, Linux]
- Browser: [e.g. chrome, safari]
- Version: [e.g. 22]
- Node.js version: [e.g. 20.11.0]

**Additional context**
Add any other context about the problem here.
```

### Feature Request

```markdown
**Is your feature request related to a problem? Please describe.**
A clear and concise description of what the problem is. Ex. I'm always frustrated when [...]

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.
```

## ⚡ Performance Guidelines

### 1. Image Optimization

```typescript
// ✅ Good: Optimized image loading
import Image from 'next/image';

<Image
  src={imageUrl}
  alt={altText}
  width={800}
  height={600}
  priority={isAboveFold}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
  className="object-cover"
/>
```

### 2. Code Splitting

```typescript
// ✅ Good: Lazy load components
import { lazy, Suspense } from 'react';

const DescriptionEditor = lazy(() => import('@/components/DescriptionEditor'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <DescriptionEditor />
    </Suspense>
  );
}
```

### 3. API Optimization

```typescript
// ✅ Good: Request caching and batching
import { unstable_cache } from 'next/cache';

export const getCachedDescriptions = unstable_cache(
  async (userId: string) => {
    return await fetchDescriptions(userId);
  },
  ['user-descriptions'],
  { revalidate: 3600 } // 1 hour
);
```

### 4. Bundle Size Monitoring

- Keep bundle size under 1MB for main bundle
- Use dynamic imports for large dependencies
- Analyze bundle with `npm run analyze`
- Monitor Core Web Vitals

## 🔒 Security Guidelines

### 1. Input Validation

```typescript
// ✅ Good: Always validate input
import { z } from 'zod';

const userInputSchema = z.object({
  text: z.string().max(1000).trim(),
  language: z.enum(['es', 'en']),
  userId: z.string().uuid()
});

// Validate before processing
const validatedInput = userInputSchema.parse(rawInput);
```

### 2. API Security

```typescript
// ✅ Good: Rate limiting and authentication
import { rateLimit } from '@/lib/rateLimit';
import { verifyAuth } from '@/lib/auth';

export async function POST(request: Request) {
  // Check rate limits
  await rateLimit(request);
  
  // Verify authentication
  const user = await verifyAuth(request);
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Process request
}
```

### 3. Environment Variables

```typescript
// ✅ Good: Validate environment variables
import { z } from 'zod';

const envSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string(),
  NODE_ENV: z.enum(['development', 'production', 'test'])
});

export const env = envSchema.parse(process.env);
```

## 📚 Documentation Standards

### 1. Code Documentation

```typescript
/**
 * Generates AI-powered descriptions for images in multiple styles
 * 
 * @param imageUrl - URL of the image to describe
 * @param style - Narrative style for the description
 * @param options - Additional generation options
 * @returns Promise resolving to generated descriptions in Spanish and English
 * 
 * @example
 * ```typescript
 * const descriptions = await generateDescription(
 *   'https://example.com/sunset.jpg',
 *   'narrativo',
 *   { maxLength: 300 }
 * );
 * ```
 * 
 * @throws {ValidationError} When input parameters are invalid
 * @throws {APIError} When AI service is unavailable
 */
export async function generateDescription(
  imageUrl: string,
  style: DescriptionStyle,
  options: GenerationOptions = {}
): Promise<Description[]> {
  // Implementation
}
```

### 2. README Updates

When adding new features, update the relevant README sections:

- Features list
- API documentation
- Environment variables
- Installation steps
- Usage examples

### 3. ADR (Architecture Decision Records)

For significant architectural decisions, create an ADR in `docs/adr/`:

```markdown
# ADR-XXX: Title

## Status
[Proposed | Accepted | Deprecated | Superseded]

## Context
What is the issue that we're seeing that is motivating this decision or change?

## Decision
What is the change that we're proposing or have agreed to implement?

## Consequences
What becomes easier or more difficult to do and any risks introduced by the change?
```

## 🎯 Best Practices Summary

### Development Workflow

1. **Start with Issues**: Always link PRs to issues
2. **Small PRs**: Keep changes focused and reviewable
3. **Test Coverage**: Maintain high test coverage (>90%)
4. **Performance**: Monitor Core Web Vitals and bundle size
5. **Accessibility**: Test with screen readers and keyboard navigation
6. **Documentation**: Update docs with code changes

### Code Quality

1. **TypeScript Strict**: Use strict mode and avoid `any`
2. **ESLint**: Fix all linting errors before committing
3. **Prettier**: Consistent code formatting
4. **Performance**: Optimize for Core Web Vitals
5. **Security**: Validate all inputs and implement proper auth

### Testing Strategy

1. **Unit Tests**: Test individual functions and components
2. **Integration Tests**: Test API endpoints and database interactions
3. **E2E Tests**: Test critical user journeys
4. **Performance Tests**: Monitor page load times and API response times

## 🆘 Getting Help

- **Discord**: Join our development community
- **GitHub Issues**: For bugs and feature requests
- **Email**: [dev@describe-it.app](mailto:dev@describe-it.app) for questions
- **Documentation**: Check the docs folder for detailed guides

## 🎉 Recognition

Contributors are recognized in:

- **README**: Contributors section
- **Releases**: Changelog mentions
- **GitHub**: Contributor graphs and statistics
- **Discord**: Special contributor role

Thank you for contributing to Describe It! 🚀