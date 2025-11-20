/**
 * Tabs component with built-in URL routing
 */

'use client';

import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { useRouterTabs } from '../hooks/useRouterTabs';
import { TabRouteConfig, TabChangeHandler } from '../types';

interface RoutedTabsProps {
  /** Tab configuration */
  tabs: Array<{
    value: string;
    label: string;
    content: React.ReactNode;
    icon?: React.ComponentType<{ className?: string }>;
    disabled?: boolean;
  }>;
  /** Routing configuration */
  config?: TabRouteConfig;
  /** Callback when tab changes */
  onTabChange?: TabChangeHandler;
  /** CSS class name for container */
  className?: string;
  /** CSS class name for tabs list */
  tabsListClassName?: string;
  /** CSS class name for tab content */
  tabsContentClassName?: string;
}

/**
 * Pre-configured Tabs component with URL routing built-in
 */
export const RoutedTabs: React.FC<RoutedTabsProps> = ({
  tabs,
  config = {},
  onTabChange,
  className = '',
  tabsListClassName = '',
  tabsContentClassName = '',
}) => {
  const validTabs = tabs.map(t => t.value);

  const { value, onValueChange, router } = useRouterTabs({
    ...config,
    validTabs,
    onTabChange,
  });

  return (
    <Tabs
      value={value}
      onValueChange={onValueChange}
      className={className}
    >
      <TabsList className={tabsListClassName}>
        {tabs.map(tab => {
          const Icon = tab.icon;

          return (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              disabled={tab.disabled}
            >
              {Icon && <Icon className="w-4 h-4 mr-2" />}
              {tab.label}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {tabs.map(tab => (
        <TabsContent
          key={tab.value}
          value={tab.value}
          className={tabsContentClassName}
        >
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
};

export default RoutedTabs;
