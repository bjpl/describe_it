import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUIStore } from '@/lib/store/uiStore';

describe('UIStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      modals: [],
      modalHistory: [],
      sidebarOpen: false,
      sidebarCollapsed: false,
      breadcrumbs: [],
      currentRoute: '/',
      theme: 'auto',
      colorScheme: 'blue',
      fontSize: 'md',
      reduceMotion: false,
      highContrast: false,
      rightPanelOpen: false,
      rightPanelContent: null,
      bottomPanelOpen: false,
      bottomPanelContent: null,
      globalLoading: false,
      loadingStates: {},
      loadingMessages: {},
      notifications: [],
      maxNotifications: 5,
      focusTrap: null,
      announcements: [],
      shortcutsEnabled: true,
      activeShortcuts: {},
      layout: 'default',
      headerVisible: true,
      footerVisible: true,
    });
  });

  describe('Modal Management', () => {
    it('should open a modal', () => {
      const { result } = renderHook(() => useUIStore());

      let modalId: string;
      act(() => {
        modalId = result.current.openModal({
          component: 'TestModal',
          priority: 1,
        });
      });

      expect(result.current.modals).toHaveLength(1);
      expect(result.current.modals[0].component).toBe('TestModal');
      expect(modalId!).toBeDefined();
    });

    it('should close modal by id', () => {
      const { result } = renderHook(() => useUIStore());

      let modalId: string;
      act(() => {
        modalId = result.current.openModal({ component: 'TestModal', priority: 1 });
        result.current.closeModal(modalId);
      });

      expect(result.current.modals).toHaveLength(0);
    });

    it('should close all modals', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openModal({ component: 'Modal1', priority: 1 });
        result.current.openModal({ component: 'Modal2', priority: 2 });
        result.current.closeAllModals();
      });

      expect(result.current.modals).toHaveLength(0);
    });

    it('should not close persistent modal with closeTopModal', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openModal({
          component: 'PersistentModal',
          priority: 1,
          persistent: true,
        });
        result.current.closeTopModal();
      });

      expect(result.current.modals).toHaveLength(1);
    });

    it('should sort modals by priority', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openModal({ component: 'LowPriority', priority: 1 });
        result.current.openModal({ component: 'HighPriority', priority: 10 });
        result.current.openModal({ component: 'MediumPriority', priority: 5 });
      });

      expect(result.current.modals[0].component).toBe('HighPriority');
      expect(result.current.modals[1].component).toBe('MediumPriority');
      expect(result.current.modals[2].component).toBe('LowPriority');
    });

    it('should update modal properties', () => {
      const { result } = renderHook(() => useUIStore());

      let modalId: string;
      act(() => {
        modalId = result.current.openModal({ component: 'TestModal', priority: 1 });
        result.current.updateModal(modalId, { size: 'lg' });
      });

      expect(result.current.modals[0].size).toBe('lg');
    });
  });

  describe('Navigation State', () => {
    it('should toggle sidebar', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.sidebarOpen).toBe(true);

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.sidebarOpen).toBe(false);
    });

    it('should set sidebar open state directly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setSidebarOpen(true);
      });

      expect(result.current.sidebarOpen).toBe(true);
    });

    it('should set sidebar collapsed state', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setSidebarCollapsed(true);
      });

      expect(result.current.sidebarCollapsed).toBe(true);
    });

    it('should set breadcrumbs', () => {
      const { result } = renderHook(() => useUIStore());

      const breadcrumbs = [
        { label: 'Home', href: '/' },
        { label: 'Settings', href: '/settings' },
      ];

      act(() => {
        result.current.setBreadcrumbs(breadcrumbs);
      });

      expect(result.current.breadcrumbs).toEqual(breadcrumbs);
    });

    it('should add breadcrumb', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.addBreadcrumb({ label: 'Home', href: '/' });
        result.current.addBreadcrumb({ label: 'Settings', href: '/settings' });
      });

      expect(result.current.breadcrumbs).toHaveLength(2);
    });

    it('should set current route', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setCurrentRoute('/settings');
      });

      expect(result.current.currentRoute).toBe('/settings');
    });
  });

  describe('Theme Management', () => {
    it('should set theme', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
    });

    it('should set color scheme', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setColorScheme('purple');
      });

      expect(result.current.colorScheme).toBe('purple');
    });

    it('should set font size', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setFontSize('lg');
      });

      expect(result.current.fontSize).toBe('lg');
    });

    it('should toggle reduce motion', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.toggleReduceMotion();
      });

      expect(result.current.reduceMotion).toBe(true);

      act(() => {
        result.current.toggleReduceMotion();
      });

      expect(result.current.reduceMotion).toBe(false);
    });

    it('should toggle high contrast', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.toggleHighContrast();
      });

      expect(result.current.highContrast).toBe(true);
    });
  });

  describe('Panel Management', () => {
    it('should open right panel', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openRightPanel('ProfilePanel', { userId: '123' });
      });

      expect(result.current.rightPanelOpen).toBe(true);
      expect(result.current.rightPanelContent).toBe('ProfilePanel');
    });

    it('should close right panel', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openRightPanel('TestPanel');
        result.current.closeRightPanel();
      });

      expect(result.current.rightPanelOpen).toBe(false);
      expect(result.current.rightPanelContent).toBeNull();
    });

    it('should toggle right panel', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openRightPanel('TestPanel');
        result.current.toggleRightPanel();
      });

      expect(result.current.rightPanelOpen).toBe(false);

      act(() => {
        result.current.toggleRightPanel();
      });

      expect(result.current.rightPanelOpen).toBe(true);
    });

    it('should open bottom panel', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openBottomPanel('ConsolePanel');
      });

      expect(result.current.bottomPanelOpen).toBe(true);
      expect(result.current.bottomPanelContent).toBe('ConsolePanel');
    });

    it('should close bottom panel', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openBottomPanel('TestPanel');
        result.current.closeBottomPanel();
      });

      expect(result.current.bottomPanelOpen).toBe(false);
      expect(result.current.bottomPanelContent).toBeNull();
    });
  });

  describe('Loading States', () => {
    it('should set global loading', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setGlobalLoading(true);
      });

      expect(result.current.globalLoading).toBe(true);
    });

    it('should set loading state for specific key', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setLoadingState('fetchingData', true, 'Loading data...');
      });

      expect(result.current.loadingStates.fetchingData).toBe(true);
      expect(result.current.loadingMessages.fetchingData).toBe('Loading data...');
    });

    it('should clear all loading states', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setLoadingState('state1', true);
        result.current.setLoadingState('state2', true);
        result.current.clearLoadingStates();
      });

      expect(Object.keys(result.current.loadingStates)).toHaveLength(0);
    });
  });

  describe('Notifications', () => {
    it('should add notification', () => {
      const { result } = renderHook(() => useUIStore());

      let notificationId: string;
      act(() => {
        notificationId = result.current.addNotification({
          type: 'success',
          title: 'Test',
          message: 'Test message',
        });
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].title).toBe('Test');
      expect(notificationId!).toBeDefined();
    });

    it('should remove notification', () => {
      const { result } = renderHook(() => useUIStore());

      let notificationId: string;
      act(() => {
        notificationId = result.current.addNotification({
          type: 'info',
          title: 'Test',
        });
        result.current.removeNotification(notificationId);
      });

      expect(result.current.notifications).toHaveLength(0);
    });

    it('should limit notifications to maxNotifications', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.addNotification({
            type: 'info',
            title: `Notification ${i}`,
          });
        }
      });

      expect(result.current.notifications.length).toBeLessThanOrEqual(
        result.current.maxNotifications
      );
    });

    it('should clear all notifications', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.addNotification({ type: 'success', title: 'Test 1' });
        result.current.addNotification({ type: 'error', title: 'Test 2' });
        result.current.clearNotifications();
      });

      expect(result.current.notifications).toHaveLength(0);
    });

    it('should auto-remove notification after duration', async () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.addNotification({
          type: 'info',
          title: 'Auto-remove',
          duration: 1000,
        });
      });

      expect(result.current.notifications).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(1100);
      });

      expect(result.current.notifications).toHaveLength(0);

      vi.useRealTimers();
    });
  });

  describe('Focus Management', () => {
    it('should set focus trap', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setFocusTrap('modal-content');
      });

      expect(result.current.focusTrap).toBe('modal-content');
    });

    it('should clear focus trap', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setFocusTrap('modal-content');
        result.current.setFocusTrap(null);
      });

      expect(result.current.focusTrap).toBeNull();
    });

    it('should announce message', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.announce('Form submitted successfully');
      });

      expect(result.current.announcements).toContain('Form submitted successfully');
    });

    it('should clear announcements', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.announce('Test announcement');
        result.current.clearAnnouncements();
      });

      expect(result.current.announcements).toHaveLength(0);
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should register keyboard shortcut', () => {
      const { result } = renderHook(() => useUIStore());
      const mockHandler = vi.fn();

      act(() => {
        result.current.registerShortcut('ctrl+s', mockHandler);
      });

      expect(result.current.activeShortcuts['ctrl+s']).toBe(mockHandler);
    });

    it('should unregister keyboard shortcut', () => {
      const { result } = renderHook(() => useUIStore());
      const mockHandler = vi.fn();

      act(() => {
        result.current.registerShortcut('ctrl+s', mockHandler);
        result.current.unregisterShortcut('ctrl+s');
      });

      expect(result.current.activeShortcuts['ctrl+s']).toBeUndefined();
    });

    it('should disable/enable shortcuts', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setShortcutsEnabled(false);
      });

      expect(result.current.shortcutsEnabled).toBe(false);

      act(() => {
        result.current.setShortcutsEnabled(true);
      });

      expect(result.current.shortcutsEnabled).toBe(true);
    });
  });

  describe('Layout Management', () => {
    it('should set layout mode', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setLayout('fullscreen');
      });

      expect(result.current.layout).toBe('fullscreen');
    });

    it('should set header visibility', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setHeaderVisible(false);
      });

      expect(result.current.headerVisible).toBe(false);
    });

    it('should set footer visibility', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setFooterVisible(false);
      });

      expect(result.current.footerVisible).toBe(false);
    });
  });
});
