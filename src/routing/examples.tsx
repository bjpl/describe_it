/**
 * Usage examples for URL-based tab routing
 */

'use client';

import React from 'react';
import { Settings, User, Bell, Home, FileText, BarChart } from 'lucide-react';
import {
  useTabRouter,
  useRouterTabs,
  useSyncedTabState,
  useDeepLink,
} from './hooks';
import { RoutedTabs, RoutedDescriptionTabs } from './components';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';

/**
 * Example 1: Basic tab routing with hooks
 */
export function BasicTabExample() {
  const { activeTab, setTab, isActive } = useTabRouter({
    paramName: 'tab',
    defaultTab: 'home',
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setTab('home')}
          className={`px-4 py-2 rounded ${
            isActive('home') ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}
        >
          Home
        </button>
        <button
          onClick={() => setTab('about')}
          className={`px-4 py-2 rounded ${
            isActive('about') ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}
        >
          About
        </button>
      </div>

      <div className="p-4 border rounded">
        {activeTab === 'home' && <div>Home content</div>}
        {activeTab === 'about' && <div>About content</div>}
      </div>
    </div>
  );
}

/**
 * Example 2: Using with existing Tabs component
 */
export function IntegratedTabsExample() {
  const { value, onValueChange } = useRouterTabs({
    paramName: 'section',
    defaultTab: 'overview',
    validTabs: ['overview', 'details', 'settings'],
  });

  return (
    <Tabs value={value} onValueChange={onValueChange}>
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <h2>Overview</h2>
        <p>Overview content goes here</p>
      </TabsContent>

      <TabsContent value="details">
        <h2>Details</h2>
        <p>Detailed information</p>
      </TabsContent>

      <TabsContent value="settings">
        <h2>Settings</h2>
        <p>Configuration options</p>
      </TabsContent>
    </Tabs>
  );
}

/**
 * Example 3: Pre-built RoutedTabs component
 */
export function RoutedTabsExample() {
  return (
    <RoutedTabs
      tabs={[
        {
          value: 'profile',
          label: 'Profile',
          icon: User,
          content: (
            <div>
              <h2>User Profile</h2>
              <p>Manage your profile information</p>
            </div>
          ),
        },
        {
          value: 'preferences',
          label: 'Preferences',
          icon: Settings,
          content: (
            <div>
              <h2>Preferences</h2>
              <p>Customize your experience</p>
            </div>
          ),
        },
        {
          value: 'notifications',
          label: 'Notifications',
          icon: Bell,
          content: (
            <div>
              <h2>Notifications</h2>
              <p>Manage notification settings</p>
            </div>
          ),
        },
      ]}
      config={{
        paramName: 'settings',
        defaultTab: 'profile',
      }}
      onTabChange={(tab, prevTab) => {
        console.log(`Navigated from ${prevTab} to ${tab}`);
      }}
    />
  );
}

/**
 * Example 4: Deep linking with sharing
 */
export function DeepLinkExample() {
  const { activeTab, setTab } = useTabRouter({
    paramName: 'view',
    defaultTab: 'dashboard',
  });

  const { currentLink, copyLink, share } = useDeepLink({
    tabParam: 'view',
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setTab('dashboard')}>Dashboard</button>
        <button onClick={() => setTab('analytics')}>Analytics</button>
        <button onClick={() => setTab('reports')}>Reports</button>
      </div>

      <div className="p-4 bg-gray-50 rounded">
        <p className="text-sm text-gray-600 mb-2">Current URL:</p>
        <code className="text-xs bg-white p-2 rounded block mb-3">
          {currentLink}
        </code>

        <div className="flex gap-2">
          <button
            onClick={() => copyLink()}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm"
          >
            Copy Link
          </button>
          <button
            onClick={() => share(undefined, 'Check this out!', 'View my content')}
            className="px-3 py-1.5 bg-green-600 text-white rounded text-sm"
          >
            Share Link
          </button>
        </div>
      </div>

      <div className="p-4 border rounded">
        {activeTab === 'dashboard' && <div>Dashboard view</div>}
        {activeTab === 'analytics' && <div>Analytics view</div>}
        {activeTab === 'reports' && <div>Reports view</div>}
      </div>
    </div>
  );
}

/**
 * Example 5: Synced tab state (bi-directional)
 */
export function SyncedStateExample() {
  const {
    tab,
    setTab,
    syncToUrl,
    syncFromUrl,
    isSynced,
  } = useSyncedTabState({
    paramName: 'mode',
    defaultTab: 'edit',
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span>Current tab: <strong>{tab}</strong></span>
        <span className={isSynced ? 'text-green-600' : 'text-yellow-600'}>
          {isSynced ? '✓ Synced' : '⚠ Not synced'}
        </span>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('edit')}>Edit Mode</button>
        <button onClick={() => setTab('preview')}>Preview Mode</button>
      </div>

      <div className="flex gap-2">
        <button onClick={syncToUrl} className="text-sm">
          Sync to URL
        </button>
        <button onClick={syncFromUrl} className="text-sm">
          Sync from URL
        </button>
      </div>
    </div>
  );
}

/**
 * Example 6: Multiple independent tab routers
 */
export function MultipleTabs() {
  const mainTabs = useTabRouter({
    paramName: 'page',
    defaultTab: 'home',
  });

  const sidebarTabs = useTabRouter({
    paramName: 'sidebar',
    defaultTab: 'files',
  });

  return (
    <div className="flex gap-4">
      {/* Sidebar - controls ?sidebar= */}
      <aside className="w-48 space-y-2">
        <button
          onClick={() => sidebarTabs.setTab('files')}
          className={sidebarTabs.isActive('files') ? 'font-bold' : ''}
        >
          Files
        </button>
        <button
          onClick={() => sidebarTabs.setTab('search')}
          className={sidebarTabs.isActive('search') ? 'font-bold' : ''}
        >
          Search
        </button>
      </aside>

      {/* Main content - controls ?page= */}
      <main className="flex-1">
        <div className="flex gap-2 mb-4">
          <button onClick={() => mainTabs.setTab('home')}>Home</button>
          <button onClick={() => mainTabs.setTab('docs')}>Docs</button>
        </div>

        <div className="border rounded p-4">
          <p>Page: {mainTabs.activeTab}</p>
          <p>Sidebar: {sidebarTabs.activeTab}</p>
        </div>
      </main>
    </div>
  );
}

/**
 * Example 7: Advanced navigation with query params
 */
export function AdvancedNavigationExample() {
  const { activeTab, navigateToTab, getTabUrl } = useTabRouter({
    paramName: 'category',
    defaultTab: 'all',
  });

  const handleNavigateWithFilter = (tab: string, filter: string) => {
    navigateToTab(tab, {
      queryParams: { filter, sort: 'newest' },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => handleNavigateWithFilter('products', 'featured')}>
          Featured Products
        </button>
        <button onClick={() => handleNavigateWithFilter('products', 'sale')}>
          Products on Sale
        </button>
      </div>

      <div className="space-y-2">
        <p className="font-semibold">Direct Links:</p>
        <ul className="space-y-1 text-sm">
          <li>
            <a href={getTabUrl('products')} className="text-blue-600 hover:underline">
              All Products
            </a>
          </li>
          <li>
            <a href={getTabUrl('services')} className="text-blue-600 hover:underline">
              Services
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}

/**
 * Example 8: Routed Description Tabs
 */
export function DescriptionExample() {
  return (
    <RoutedDescriptionTabs
      englishDescription="This is a comprehensive guide to using our application. It includes detailed instructions and examples."
      spanishDescription="Esta es una guía completa para usar nuestra aplicación. Incluye instrucciones detalladas y ejemplos."
      selectedStyle="detailed"
      routeConfig={{
        paramName: 'lang',
        defaultTab: 'spanish',
      }}
      enableSharing={true}
    />
  );
}

/**
 * Example 9: Dashboard with nested tabs
 */
export function DashboardExample() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <RoutedTabs
        tabs={[
          {
            value: 'overview',
            label: 'Overview',
            icon: Home,
            content: (
              <div className="space-y-4">
                <h2 className="text-xl">Overview</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded">
                    <p className="text-sm text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold">1,234</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded">
                    <p className="text-sm text-gray-600">Active Sessions</p>
                    <p className="text-2xl font-bold">456</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded">
                    <p className="text-sm text-gray-600">Revenue</p>
                    <p className="text-2xl font-bold">$12,345</p>
                  </div>
                </div>
              </div>
            ),
          },
          {
            value: 'analytics',
            label: 'Analytics',
            icon: BarChart,
            content: (
              <div>
                <h2 className="text-xl mb-4">Analytics</h2>
                <p>Analytics charts and graphs would go here</p>
              </div>
            ),
          },
          {
            value: 'reports',
            label: 'Reports',
            icon: FileText,
            content: (
              <div>
                <h2 className="text-xl mb-4">Reports</h2>
                <ul className="space-y-2">
                  <li className="p-3 bg-gray-50 rounded">Monthly Report</li>
                  <li className="p-3 bg-gray-50 rounded">Quarterly Report</li>
                  <li className="p-3 bg-gray-50 rounded">Annual Report</li>
                </ul>
              </div>
            ),
          },
        ]}
        config={{
          paramName: 'view',
          defaultTab: 'overview',
          scroll: false,
        }}
      />
    </div>
  );
}

/**
 * Example 10: Tab with validation and callbacks
 */
export function ValidatedTabsExample() {
  const validTabs = ['home', 'about', 'contact'];

  const { value, onValueChange } = useRouterTabs({
    paramName: 'page',
    defaultTab: 'home',
    validTabs,
    onTabChange: (newTab, oldTab) => {
      console.log(`Tab changed from ${oldTab} to ${newTab}`);
      // Analytics tracking
      // window.gtag?.('event', 'tab_change', { from: oldTab, to: newTab });
    },
  });

  return (
    <Tabs value={value} onValueChange={onValueChange}>
      <TabsList>
        <TabsTrigger value="home">Home</TabsTrigger>
        <TabsTrigger value="about">About</TabsTrigger>
        <TabsTrigger value="contact">Contact</TabsTrigger>
      </TabsList>

      <TabsContent value="home">Home Page</TabsContent>
      <TabsContent value="about">About Us</TabsContent>
      <TabsContent value="contact">Contact Form</TabsContent>
    </Tabs>
  );
}
