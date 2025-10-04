# Reusable UI Components Usage Examples

## LoadingState Component

### Basic Usage
```tsx
import { LoadingState } from '@/components';

// Simple loading state
<LoadingState />

// With custom message
<LoadingState message="Processing your request..." />

// With progress
<LoadingState message="Uploading..." progress={75} />

// As overlay
<LoadingState overlay message="Saving changes..." />
```

### Inline and Button Loading
```tsx
import { InlineLoadingState, ButtonLoadingState } from '@/components';

// For inline loading
<InlineLoadingState message="Saving..." />

// For button loading state
<button disabled={loading}>
  {loading ? <ButtonLoadingState /> : 'Submit'}
</button>
```

## ErrorState Component

### Basic Usage
```tsx
import { ErrorState } from '@/components';

// Simple error
<ErrorState />

// Custom error with retry
<ErrorState 
  title="Upload Failed"
  message="The file could not be uploaded. Please try again."
  onRetry={handleRetry}
  retrying={isRetrying}
/>

// With navigation options
<ErrorState 
  title="Page Not Found"
  message="The page you're looking for doesn't exist."
  onGoBack={() => router.back()}
  onGoHome={() => router.push('/')}
  showNavigation
/>
```

### Specialized Error States
```tsx
import { InlineErrorState, NetworkErrorState } from '@/components';

// Inline error for forms
<InlineErrorState 
  message="Invalid email format" 
  onRetry={validateEmail}
/>

// Network-specific error
<NetworkErrorState onRetry={refetchData} />
```

## EmptyState Component

### Basic Usage
```tsx
import { EmptyState } from '@/components';

// Basic empty state
<EmptyState />

// Search empty state
<EmptyState 
  type="search"
  action={{ label: 'Clear Filters', onClick: clearFilters }}
/>

// With custom content
<EmptyState 
  title="No vocabulary words yet"
  description="Start building your Spanish vocabulary by adding your first word."
  action={{ label: 'Add Word', onClick: openAddWordModal }}
  type="vocabulary"
/>
```

### Specialized Empty States
```tsx
import { InlineEmptyState, SearchEmptyState } from '@/components';

// Inline for lists
<InlineEmptyState type="vocabulary" message="No words in this category" />

// Search-specific with clear functionality
<SearchEmptyState 
  query={searchQuery}
  onClearSearch={() => setSearchQuery('')}
  onTryExample={() => setSearchQuery('ejemplo')}
/>
```

## Features

### LoadingState
- ✅ SSR-safe (no hydration issues)
- ✅ Multiple sizes (sm, md, lg)
- ✅ Progress bar support
- ✅ Overlay mode
- ✅ Proper accessibility (ARIA labels)
- ✅ Variants: default, inline, button

### ErrorState
- ✅ Customizable error messages
- ✅ Retry functionality with loading state
- ✅ Navigation options (back, home)
- ✅ Error code display
- ✅ Multiple sizes
- ✅ Proper accessibility
- ✅ Variants: default, inline, network-specific

### EmptyState
- ✅ Type-specific defaults (search, images, vocabulary, etc.)
- ✅ Custom icons and messages
- ✅ Action buttons (primary and secondary)
- ✅ Multiple sizes
- ✅ Proper accessibility
- ✅ Variants: default, inline, search-specific

## Design Principles

1. **SSR-Safe**: No complex animations during initial render
2. **Accessible**: Proper ARIA labels and roles
3. **Flexible**: Multiple size variants and customization options
4. **Consistent**: Uses Tailwind design tokens and project color scheme
5. **Reusable**: Works across different contexts in the application
6. **Performance**: Lightweight with CSS transitions instead of JavaScript animations