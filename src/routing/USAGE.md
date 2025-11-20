# Routing System - Usage Examples

Import the routing system:

```tsx
// Hooks
import { useTabRouter, useRouterTabs, useSyncedTabState, useDeepLink } from '@/routing';

// Components
import { RoutedTabs, RoutedDescriptionTabs } from '@/routing';

// Utils (if needed)
import { createShareableLink, buildTabRoute } from '@/routing/utils';
```

## Quick Examples

### 1. Basic Hook Usage
```tsx
'use client';
import { useTabRouter } from '@/routing';

function MyTabs() {
  const { activeTab, setTab } = useTabRouter({ defaultTab: 'home' });

  return (
    <>
      <button onClick={() => setTab('home')}>Home</button>
      <button onClick={() => setTab('about')}>About</button>
      <div>{activeTab === 'home' ? <Home /> : <About />}</div>
    </>
  );
}
```

### 2. With Existing UI Components
```tsx
'use client';
import { Tabs } from '@/components/ui/Tabs';
import { useRouterTabs } from '@/routing';

function MyPage() {
  const { value, onValueChange } = useRouterTabs({ defaultTab: 'tab1' });

  return (
    <Tabs value={value} onValueChange={onValueChange}>
      {/* Your tabs here */}
    </Tabs>
  );
}
```

### 3. Pre-built Component
```tsx
'use client';
import { RoutedTabs } from '@/routing';

function Settings() {
  return (
    <RoutedTabs
      tabs={[
        { value: 'general', label: 'General', content: <GeneralSettings /> },
        { value: 'advanced', label: 'Advanced', content: <AdvancedSettings /> },
      ]}
      config={{ defaultTab: 'general' }}
    />
  );
}
```

See `/src/routing/examples.tsx` for 10 complete examples.
