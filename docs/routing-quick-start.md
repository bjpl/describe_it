# Quick Start Guide - URL Routing for Tabs

## Installation

No installation needed! The routing system is already implemented in `/src/routing/`.

## 5-Minute Quick Start

### Step 1: Import the Hook

```tsx
'use client';

import { useTabRouter } from '@/routing';

export function MyComponent() {
  const { activeTab, setTab, isActive } = useTabRouter({
    paramName: 'tab',
    defaultTab: 'home',
  });

  return (
    <div>
      <button onClick={() => setTab('home')}>Home</button>
      <button onClick={() => setTab('about')}>About</button>

      {activeTab === 'home' && <div>Home Content</div>}
      {activeTab === 'about' && <div>About Content</div>}
    </div>
  );
}
```

**Result**: URL automatically updates to `?tab=home` or `?tab=about`, with full browser history support.

### Step 2: Integrate with Existing Tabs

```tsx
'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { useRouterTabs } from '@/routing';

export function ExistingTabsExample() {
  // Just add these two lines!
  const { value, onValueChange } = useRouterTabs({
    defaultTab: 'overview',
  });

  return (
    <Tabs value={value} onValueChange={onValueChange}>
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="details">Details</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">Overview content</TabsContent>
      <TabsContent value="details">Details content</TabsContent>
    </Tabs>
  );
}
```

### Step 3: Use Pre-built Component

```tsx
'use client';

import { RoutedTabs } from '@/routing';

export function SimplestExample() {
  return (
    <RoutedTabs
      tabs={[
        { value: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
        { value: 'tab2', label: 'Tab 2', content: <div>Content 2</div> },
      ]}
      config={{ defaultTab: 'tab1' }}
    />
  );
}
```

## Common Use Cases

### Use Case 1: Settings Page

```tsx
import { RoutedTabs } from '@/routing';
import { Settings, User, Bell } from 'lucide-react';

export function SettingsPage() {
  return (
    <RoutedTabs
      tabs={[
        {
          value: 'profile',
          label: 'Profile',
          icon: User,
          content: <ProfileSettings />,
        },
        {
          value: 'preferences',
          label: 'Preferences',
          icon: Settings,
          content: <PreferenceSettings />,
        },
        {
          value: 'notifications',
          label: 'Notifications',
          icon: Bell,
          content: <NotificationSettings />,
        },
      ]}
      config={{
        paramName: 'section',
        defaultTab: 'profile',
      }}
    />
  );
}
```

**URL**: `/settings?section=profile`

### Use Case 2: Dashboard with Deep Links

```tsx
import { useTabRouter, useDeepLink } from '@/routing';

export function Dashboard() {
  const { activeTab, setTab } = useTabRouter({
    paramName: 'view',
    defaultTab: 'overview',
  });

  const { currentLink, copyLink } = useDeepLink({
    tabParam: 'view',
  });

  return (
    <div>
      <nav>
        <button onClick={() => setTab('overview')}>Overview</button>
        <button onClick={() => setTab('analytics')}>Analytics</button>
      </nav>

      <button onClick={() => copyLink()}>
        Share this view
      </button>

      {/* Content */}
      {activeTab === 'overview' && <Overview />}
      {activeTab === 'analytics' && <Analytics />}
    </div>
  );
}
```

### Use Case 3: Enhanced Description Tabs

Replace your existing DescriptionTabs:

```tsx
// Before
import { DescriptionTabs } from '@/components/DescriptionTabs';

// After
import { RoutedDescriptionTabs } from '@/routing';

export function DescriptionPage() {
  return (
    <RoutedDescriptionTabs
      englishDescription="Description in English"
      spanishDescription="Descripción en español"
      selectedStyle="detailed"
      routeConfig={{
        paramName: 'lang',
        defaultTab: 'spanish',
      }}
      enableSharing={true}
    />
  );
}
```

**Features Added**:
- URL sync: `/page?lang=english` or `/page?lang=spanish`
- Share button to copy deep link
- Browser back/forward support

## API Cheat Sheet

### useTabRouter
```tsx
const { activeTab, setTab, isActive, getTabUrl, navigateToTab } = useTabRouter({
  paramName: 'tab',      // Query param name
  defaultTab: 'home',    // Default value
  replace: false,        // Use replace instead of push
  scroll: false,         // Scroll to top on change
  preserveParams: true,  // Keep other query params
});
```

### useRouterTabs
```tsx
const { value, onValueChange } = useRouterTabs({
  paramName: 'tab',
  defaultTab: 'home',
  validTabs: ['home', 'about', 'contact'],
  onTabChange: (newTab, oldTab) => console.log('Changed!'),
});
```

### useDeepLink
```tsx
const { currentLink, copyLink, share, generateLink } = useDeepLink({
  tabParam: 'tab',
  includeParams: ['filter', 'sort'],
});
```

## Configuration Examples

### Different Parameter Name
```tsx
useTabRouter({ paramName: 'view' })  // ?view=dashboard
useTabRouter({ paramName: 'mode' })  // ?mode=edit
useTabRouter({ paramName: 'lang' })  // ?lang=en
```

### Replace History Instead of Push
```tsx
useTabRouter({ replace: true })  // No new history entries
```

### Scroll to Top on Tab Change
```tsx
useTabRouter({ scroll: true })  // Scroll to top
```

### Clear Other Query Params
```tsx
useTabRouter({ preserveParams: false })  // Clear other params
```

## Multiple Independent Tab Groups

```tsx
export function ComplexPage() {
  // Main navigation: ?page=...
  const mainNav = useTabRouter({
    paramName: 'page',
    defaultTab: 'home',
  });

  // Sidebar: ?sidebar=...
  const sidebar = useTabRouter({
    paramName: 'sidebar',
    defaultTab: 'files',
  });

  return (
    <div>
      <nav>
        <button onClick={() => mainNav.setTab('home')}>Home</button>
        <button onClick={() => mainNav.setTab('docs')}>Docs</button>
      </nav>

      <aside>
        <button onClick={() => sidebar.setTab('files')}>Files</button>
        <button onClick={() => sidebar.setTab('search')}>Search</button>
      </aside>

      {/* Both states are independent in URL: ?page=home&sidebar=files */}
    </div>
  );
}
```

## Advanced Features

### Programmatic Navigation with Extra Params
```tsx
const { navigateToTab } = useTabRouter();

navigateToTab('products', {
  queryParams: {
    filter: 'featured',
    sort: 'price',
  },
});
// Result: ?tab=products&filter=featured&sort=price
```

### Get URL for Any Tab
```tsx
const { getTabUrl } = useTabRouter();

const productsUrl = getTabUrl('products');
// Use in <a href={productsUrl}>Products</a>
```

### Tab Change Callbacks
```tsx
useRouterTabs({
  onTabChange: (newTab, oldTab) => {
    // Analytics
    gtag('event', 'tab_change', { from: oldTab, to: newTab });

    // Side effects
    if (newTab === 'settings') {
      loadSettings();
    }
  },
});
```

## TypeScript Support

All functions are fully typed:

```tsx
import type { TabRouteConfig, TabRouterState } from '@/routing';

const config: TabRouteConfig = {
  paramName: 'tab',
  defaultTab: 'home',
};

const router: TabRouterState = useTabRouter(config);
```

## Troubleshooting

### Tabs not syncing with URL
- Make sure component is client-side: `'use client'`
- Check that `useTabRouter` is inside a component

### Browser back button not working
- Verify `replace: false` (default)
- Check that navigation is happening

### Deep links not working
- Ensure base URL is correct
- Check that tab values match exactly

### State out of sync
- Use `useSyncedTabState` for bi-directional sync
- Call `syncToUrl()` or `syncFromUrl()` manually

## More Examples

See `/src/routing/examples.tsx` for 10 complete examples including:
1. Basic tabs
2. Existing component integration
3. Pre-built RoutedTabs
4. Deep linking with sharing
5. Synced state management
6. Multiple independent routers
7. Advanced navigation
8. Description tabs
9. Dashboard example
10. Validated tabs with callbacks

## Full Documentation

See `/src/routing/README.md` for complete API reference and detailed documentation.
