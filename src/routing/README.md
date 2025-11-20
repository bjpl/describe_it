# URL-Based Tab Routing System

Comprehensive routing solution for tabs with URL synchronization, deep linking, and browser history support.

## Features

- ✅ **URL Synchronization** - Tab state automatically syncs with URL query parameters
- ✅ **Browser History** - Full support for back/forward navigation
- ✅ **Deep Linking** - Shareable URLs that link directly to specific tabs
- ✅ **Query Parameter Management** - Flexible handling of URL parameters
- ✅ **TypeScript Support** - Fully typed API
- ✅ **Next.js 15 Optimized** - Built for Next.js App Router
- ✅ **SSR Compatible** - Works with server-side rendering

## Quick Start

### Basic Usage with Hooks

```tsx
'use client';

import { useTabRouter } from '@/routing/hooks';

export function MyTabs() {
  const { activeTab, setTab, isActive } = useTabRouter({
    paramName: 'tab',
    defaultTab: 'overview',
  });

  return (
    <div>
      <button
        onClick={() => setTab('overview')}
        className={isActive('overview') ? 'active' : ''}
      >
        Overview
      </button>
      <button
        onClick={() => setTab('details')}
        className={isActive('details') ? 'active' : ''}
      >
        Details
      </button>

      {activeTab === 'overview' && <div>Overview content</div>}
      {activeTab === 'details' && <div>Details content</div>}
    </div>
  );
}
```

### Using with Existing Tabs Component

```tsx
'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { useRouterTabs } from '@/routing/hooks';

export function RoutedTabsExample() {
  const { value, onValueChange } = useRouterTabs({
    paramName: 'section',
    defaultTab: 'home',
  });

  return (
    <Tabs value={value} onValueChange={onValueChange}>
      <TabsList>
        <TabsTrigger value="home">Home</TabsTrigger>
        <TabsTrigger value="about">About</TabsTrigger>
        <TabsTrigger value="contact">Contact</TabsTrigger>
      </TabsList>

      <TabsContent value="home">Home content</TabsContent>
      <TabsContent value="about">About content</TabsContent>
      <TabsContent value="contact">Contact content</TabsContent>
    </Tabs>
  );
}
```

### Pre-built Routed Tabs Component

```tsx
'use client';

import { RoutedTabs } from '@/routing/components';
import { Settings, User, Bell } from 'lucide-react';

export function SettingsTabs() {
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
          content: <PreferencesSettings />,
        },
        {
          value: 'notifications',
          label: 'Notifications',
          icon: Bell,
          content: <NotificationSettings />,
        },
      ]}
      config={{
        paramName: 'settings',
        defaultTab: 'profile',
      }}
      onTabChange={(tab, prevTab) => {
        console.log(`Tab changed from ${prevTab} to ${tab}`);
      }}
    />
  );
}
```

### Deep Linking

```tsx
'use client';

import { useDeepLink } from '@/routing/hooks';

export function ShareableTab() {
  const { currentLink, copyLink, share } = useDeepLink({
    tabParam: 'tab',
  });

  return (
    <div>
      <p>Current URL: {currentLink}</p>

      <button onClick={() => copyLink()}>
        Copy Link
      </button>

      <button onClick={() => share(undefined, 'Check this out!')}>
        Share Link
      </button>
    </div>
  );
}
```

### Enhanced Description Tabs with Routing

```tsx
'use client';

import { RoutedDescriptionTabs } from '@/routing/components';

export function DescriptionPage() {
  return (
    <RoutedDescriptionTabs
      englishDescription="This is the English description"
      spanishDescription="Esta es la descripción en español"
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

## API Reference

### Hooks

#### `useTabRouter(config?)`

Main hook for URL-based tab routing.

**Config:**
- `paramName?: string` - URL parameter name (default: 'tab')
- `defaultTab?: string` - Default tab when no URL param
- `replace?: boolean` - Use replace instead of push (default: false)
- `scroll?: boolean` - Scroll to top on change (default: false)
- `preserveParams?: boolean` - Keep other query params (default: true)

**Returns:**
- `activeTab: string` - Current active tab
- `setTab: (tab: string) => void` - Navigate to tab
- `isActive: (tab: string) => boolean` - Check if tab is active
- `getTabUrl: (tab: string) => string` - Get URL for tab
- `navigateToTab: (tab, options) => void` - Navigate with options

#### `useRouterTabs(options?)`

Integrates routing with existing Tabs component.

**Options:** Extends `useTabRouter` config with:
- `validTabs?: string[]` - List of valid tab values
- `onTabChange?: (tab, prevTab) => void` - Change callback

**Returns:**
- `value: string` - For Tabs component
- `onValueChange: (value) => void` - For Tabs component
- `router: TabRouterState` - Full router state

#### `useSyncedTabState(options?)`

Bi-directional sync between local state and URL.

**Options:** Extends config with:
- `initialTab?: string` - Initial tab value
- `onUrlChange?: (tab) => void` - URL change callback
- `syncOnMount?: boolean` - Sync on mount (default: true)

**Returns:**
- `tab: string` - Current tab
- `setTab: (tab) => void` - Update tab
- `syncToUrl: () => void` - Force sync to URL
- `syncFromUrl: () => void` - Force sync from URL
- `isSynced: boolean` - Whether states match

#### `useDeepLink(options?)`

Deep linking and sharing functionality.

**Options:**
- `tabParam?: string` - Tab parameter name
- `includeParams?: string[]` - Additional params to include
- `baseUrl?: string` - Base URL for links

**Returns:**
- `currentTab: string` - Current tab from URL
- `currentLink: string` - Deep link for current tab
- `generateLink: (tab) => string` - Generate link for any tab
- `copyLink: (tab?) => Promise<boolean>` - Copy to clipboard
- `share: (tab?, title?, text?) => Promise<boolean>` - Web Share API

### Components

#### `<RoutedTabs>`

Pre-configured Tabs with routing built-in.

**Props:**
- `tabs: TabConfig[]` - Tab configurations
- `config?: TabRouteConfig` - Routing config
- `onTabChange?: (tab, prevTab) => void` - Change callback
- `className?: string` - Container class
- `tabsListClassName?: string` - Tabs list class
- `tabsContentClassName?: string` - Content class

#### `<RoutedDescriptionTabs>`

Enhanced DescriptionTabs with URL routing.

**Props:** Same as DescriptionTabs plus:
- `routeConfig?: TabRouteConfig` - Routing configuration
- `enableSharing?: boolean` - Enable deep linking (default: true)

### Utilities

#### URL Parameter Utils

```ts
import {
  parseUrlParams,
  buildUrlParams,
  mergeQueryParams,
  createUrlWithParams,
  validateTabParam
} from '@/routing/utils';
```

#### Route Builder Utils

```ts
import {
  buildTabRoute,
  extractTabFromRoute,
  normalizeTabValue,
  denormalizeTabValue
} from '@/routing/utils';
```

#### Deep Linking Utils

```ts
import {
  generateDeepLink,
  parseDeepLink,
  createShareableLink,
  copyDeepLinkToClipboard,
  shareDeepLink
} from '@/routing/utils';
```

## Examples

### Multiple Tabs with Different Configs

```tsx
export function MultiTabPage() {
  // Main navigation tabs
  const mainTabs = useTabRouter({
    paramName: 'view',
    defaultTab: 'dashboard',
  });

  // Settings sub-tabs
  const settingsTabs = useTabRouter({
    paramName: 'settings',
    defaultTab: 'general',
  });

  return (
    <div>
      {/* Main tabs affect ?view= */}
      <nav>
        <button onClick={() => mainTabs.setTab('dashboard')}>
          Dashboard
        </button>
        <button onClick={() => mainTabs.setTab('settings')}>
          Settings
        </button>
      </nav>

      {mainTabs.activeTab === 'dashboard' && <Dashboard />}

      {mainTabs.activeTab === 'settings' && (
        <div>
          {/* Sub-tabs affect ?settings= */}
          <nav>
            <button onClick={() => settingsTabs.setTab('general')}>
              General
            </button>
            <button onClick={() => settingsTabs.setTab('advanced')}>
              Advanced
            </button>
          </nav>

          {settingsTabs.activeTab === 'general' && <GeneralSettings />}
          {settingsTabs.activeTab === 'advanced' && <AdvancedSettings />}
        </div>
      )}
    </div>
  );
}
```

### With Additional Query Parameters

```tsx
export function FilteredTabs() {
  const { activeTab, navigateToTab } = useTabRouter({
    paramName: 'category',
    defaultTab: 'all',
  });

  const handleFilterChange = (filter: string) => {
    navigateToTab(activeTab, {
      queryParams: { filter },
    });
  };

  return (
    <div>
      {/* Tabs control ?category= */}
      <Tabs />

      {/* Filter controls ?filter= while preserving ?category= */}
      <select onChange={(e) => handleFilterChange(e.target.value)}>
        <option value="recent">Recent</option>
        <option value="popular">Popular</option>
      </select>
    </div>
  );
}
```

## Best Practices

1. **Use meaningful parameter names**: `?section=` instead of `?tab=`
2. **Validate tab values**: Use `validTabs` to prevent invalid states
3. **Preserve query params**: Keep `preserveParams: true` unless you need to clear them
4. **Handle SSR**: Components must be client-side (`'use client'`)
5. **Deep linking**: Enable sharing for user-facing tabs
6. **Accessibility**: Maintain proper ARIA attributes on tab elements

## Migration Guide

### From Local State

```tsx
// Before
const [activeTab, setActiveTab] = useState('home');

// After
const { activeTab, setTab } = useTabRouter({
  defaultTab: 'home',
});
// setActiveTab → setTab
```

### From Existing Tabs

```tsx
// Before
<Tabs defaultValue="home">
  ...
</Tabs>

// After
const { value, onValueChange } = useRouterTabs({
  defaultTab: 'home',
});

<Tabs value={value} onValueChange={onValueChange}>
  ...
</Tabs>
```

## License

MIT
