import React from 'react';
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { createShallowSelector } from '../utils/storeUtils';
import { ssrPersist } from './middleware/ssrPersist';

/**
 * UI State Store - Manages application UI state
 * Features:
 * - Modal management with stacking
 * - Navigation state and breadcrumbs
 * - Sidebar and panel management
 * - Theme and display settings
 * - Loading states
 * - Notification queue
 * - Keyboard shortcuts
 * - Focus management
 */

export interface Modal {
  id: string;
  component: string;
  props?: Record<string, any>;
  priority: number;
  persistent?: boolean; // Can't be closed with ESC or backdrop
  backdrop?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  position?: 'center' | 'top' | 'bottom';
  animation?: 'fade' | 'slide' | 'zoom';
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number; // ms, 0 = permanent
  action?: {
    label: string;
    handler: () => void;
  };
  timestamp: Date;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: string;
  disabled?: boolean;
}

export interface UIState {
  // Modals
  modals: Modal[];
  modalHistory: string[];
  
  // Navigation
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  breadcrumbs: BreadcrumbItem[];
  currentRoute: string;
  
  // Theme and display
  theme: 'light' | 'dark' | 'auto';
  colorScheme: string;
  fontSize: 'sm' | 'md' | 'lg' | 'xl';
  reduceMotion: boolean;
  highContrast: boolean;
  
  // Panels
  rightPanelOpen: boolean;
  rightPanelContent: string | null;
  bottomPanelOpen: boolean;
  bottomPanelContent: string | null;
  
  // Loading states
  globalLoading: boolean;
  loadingStates: Record<string, boolean>;
  loadingMessages: Record<string, string>;
  
  // Notifications
  notifications: Notification[];
  maxNotifications: number;
  
  // Focus and accessibility
  focusTrap: string | null; // ID of element with focus trap
  announcements: string[];
  
  // Keyboard shortcuts
  shortcutsEnabled: boolean;
  activeShortcuts: Record<string, () => void>;
  
  // Layout
  layout: 'default' | 'fullscreen' | 'focused' | 'presentation';
  headerVisible: boolean;
  footerVisible: boolean;
  
  // Actions
  // Modal management
  openModal: (modal: Omit<Modal, 'id'>) => string;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
  closeTopModal: () => void;
  updateModal: (id: string, updates: Partial<Modal>) => void;
  
  // Navigation
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
  addBreadcrumb: (item: BreadcrumbItem) => void;
  setCurrentRoute: (route: string) => void;
  
  // Theme
  setTheme: (theme: UIState['theme']) => void;
  setColorScheme: (scheme: string) => void;
  setFontSize: (size: UIState['fontSize']) => void;
  toggleReduceMotion: () => void;
  toggleHighContrast: () => void;
  
  // Panels
  openRightPanel: (content: string, props?: Record<string, any>) => void;
  closeRightPanel: () => void;
  toggleRightPanel: () => void;
  openBottomPanel: (content: string, props?: Record<string, any>) => void;
  closeBottomPanel: () => void;
  toggleBottomPanel: () => void;
  
  // Loading
  setGlobalLoading: (loading: boolean) => void;
  setLoadingState: (key: string, loading: boolean, message?: string) => void;
  clearLoadingStates: () => void;
  
  // Notifications
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Focus management
  setFocusTrap: (elementId: string | null) => void;
  announce: (message: string) => void;
  clearAnnouncements: () => void;
  
  // Keyboard shortcuts
  registerShortcut: (key: string, handler: () => void) => void;
  unregisterShortcut: (key: string) => void;
  setShortcutsEnabled: (enabled: boolean) => void;
  
  // Layout
  setLayout: (layout: UIState['layout']) => void;
  setHeaderVisible: (visible: boolean) => void;
  setFooterVisible: (visible: boolean) => void;
}

const defaultUIState = {
  modals: [],
  modalHistory: [],
  sidebarOpen: false,
  sidebarCollapsed: false,
  breadcrumbs: [],
  currentRoute: '/',
  theme: 'auto' as const,
  colorScheme: 'blue',
  fontSize: 'md' as const,
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
  layout: 'default' as const,
  headerVisible: true,
  footerVisible: true
};\n\nexport const useUIStore = create<UIState>()(  \n  devtools(\n    subscribeWithSelector(\n      ssrPersist(\n        (set, get) => ({\n          ...defaultUIState,\n          \n          // Modal management\n          openModal: (modalData) => {\n            const id = `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;\n            const modal: Modal = {\n              ...modalData,\n              id,\n              priority: modalData.priority || 0\n            };\n            \n            set((state) => ({\n              modals: [...state.modals, modal].sort((a, b) => b.priority - a.priority),\n              modalHistory: [...state.modalHistory, id]\n            }), false, 'openModal');\n            \n            return id;\n          },\n          \n          closeModal: (id) => {\n            set((state) => ({\n              modals: state.modals.filter(modal => modal.id !== id),\n              modalHistory: state.modalHistory.filter(modalId => modalId !== id)\n            }), false, 'closeModal');\n          },\n          \n          closeAllModals: () => {\n            set({ modals: [], modalHistory: [] }, false, 'closeAllModals');\n          },\n          \n          closeTopModal: () => {\n            set((state) => {\n              if (state.modals.length === 0) return state;\n              \n              const topModal = state.modals[0];\n              if (topModal.persistent) return state;\n              \n              return {\n                modals: state.modals.slice(1),\n                modalHistory: state.modalHistory.filter(id => id !== topModal.id)\n              };\n            }, false, 'closeTopModal');\n          },\n          \n          updateModal: (id, updates) => {\n            set((state) => ({\n              modals: state.modals.map(modal => \n                modal.id === id ? { ...modal, ...updates } : modal\n              )\n            }), false, 'updateModal');\n          },\n          \n          // Navigation\n          setSidebarOpen: (open) => {\n            set({ sidebarOpen: open }, false, 'setSidebarOpen');\n          },\n          \n          toggleSidebar: () => {\n            set((state) => ({ sidebarOpen: !state.sidebarOpen }), false, 'toggleSidebar');\n          },\n          \n          setSidebarCollapsed: (collapsed) => {\n            set({ sidebarCollapsed: collapsed }, false, 'setSidebarCollapsed');\n          },\n          \n          setBreadcrumbs: (breadcrumbs) => {\n            set({ breadcrumbs }, false, 'setBreadcrumbs');\n          },\n          \n          addBreadcrumb: (item) => {\n            set((state) => ({\n              breadcrumbs: [...state.breadcrumbs, item]\n            }), false, 'addBreadcrumb');\n          },\n          \n          setCurrentRoute: (route) => {\n            set({ currentRoute: route }, false, 'setCurrentRoute');\n          },\n          \n          // Theme\n          setTheme: (theme) => {\n            set({ theme }, false, 'setTheme');\n            \n            // Apply theme to document\n            if (typeof window !== 'undefined') {\n              const root = document.documentElement;\n              root.setAttribute('data-theme', theme);\n              \n              if (theme === 'auto') {\n                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;\n                root.classList.toggle('dark', prefersDark);\n              } else {\n                root.classList.toggle('dark', theme === 'dark');\n              }\n            }\n          },\n          \n          setColorScheme: (scheme) => {\n            set({ colorScheme: scheme }, false, 'setColorScheme');\n            \n            if (typeof window !== 'undefined') {\n              document.documentElement.setAttribute('data-color-scheme', scheme);\n            }\n          },\n          \n          setFontSize: (size) => {\n            set({ fontSize: size }, false, 'setFontSize');\n            \n            if (typeof window !== 'undefined') {\n              document.documentElement.setAttribute('data-font-size', size);\n            }\n          },\n          \n          toggleReduceMotion: () => {\n            set((state) => {\n              const newValue = !state.reduceMotion;\n              \n              if (typeof window !== 'undefined') {\n                document.documentElement.setAttribute('data-reduce-motion', String(newValue));\n              }\n              \n              return { reduceMotion: newValue };\n            }, false, 'toggleReduceMotion');\n          },\n          \n          toggleHighContrast: () => {\n            set((state) => {\n              const newValue = !state.highContrast;\n              \n              if (typeof window !== 'undefined') {\n                document.documentElement.setAttribute('data-high-contrast', String(newValue));\n              }\n              \n              return { highContrast: newValue };\n            }, false, 'toggleHighContrast');\n          },\n          \n          // Panels\n          openRightPanel: (content, props) => {\n            set({ \n              rightPanelOpen: true, \n              rightPanelContent: content,\n              rightPanelProps: props \n            }, false, 'openRightPanel');\n          },\n          \n          closeRightPanel: () => {\n            set({ \n              rightPanelOpen: false, \n              rightPanelContent: null,\n              rightPanelProps: undefined \n            }, false, 'closeRightPanel');\n          },\n          \n          toggleRightPanel: () => {\n            set((state) => ({ rightPanelOpen: !state.rightPanelOpen }), false, 'toggleRightPanel');\n          },\n          \n          openBottomPanel: (content, props) => {\n            set({ \n              bottomPanelOpen: true, \n              bottomPanelContent: content,\n              bottomPanelProps: props \n            }, false, 'openBottomPanel');\n          },\n          \n          closeBottomPanel: () => {\n            set({ \n              bottomPanelOpen: false, \n              bottomPanelContent: null,\n              bottomPanelProps: undefined \n            }, false, 'closeBottomPanel');\n          },\n          \n          toggleBottomPanel: () => {\n            set((state) => ({ bottomPanelOpen: !state.bottomPanelOpen }), false, 'toggleBottomPanel');\n          },\n          \n          // Loading\n          setGlobalLoading: (loading) => {\n            set({ globalLoading: loading }, false, 'setGlobalLoading');\n          },\n          \n          setLoadingState: (key, loading, message) => {\n            set((state) => ({\n              loadingStates: { ...state.loadingStates, [key]: loading },\n              loadingMessages: message \n                ? { ...state.loadingMessages, [key]: message }\n                : state.loadingMessages\n            }), false, 'setLoadingState');\n          },\n          \n          clearLoadingStates: () => {\n            set({ loadingStates: {}, loadingMessages: {} }, false, 'clearLoadingStates');\n          },\n          \n          // Notifications\n          addNotification: (notificationData) => {\n            const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;\n            const notification: Notification = {\n              ...notificationData,\n              id,\n              timestamp: new Date()\n            };\n            \n            set((state) => {\n              const newNotifications = [notification, ...state.notifications];\n              \n              // Keep only maxNotifications\n              const trimmedNotifications = newNotifications.slice(0, state.maxNotifications);\n              \n              return { notifications: trimmedNotifications };\n            }, false, 'addNotification');\n            \n            // Auto-remove notification if duration is set\n            if (notification.duration && notification.duration > 0) {\n              setTimeout(() => {\n                get().removeNotification(id);\n              }, notification.duration);\n            }\n            \n            return id;\n          },\n          \n          removeNotification: (id) => {\n            set((state) => ({\n              notifications: state.notifications.filter(notification => notification.id !== id)\n            }), false, 'removeNotification');\n          },\n          \n          clearNotifications: () => {\n            set({ notifications: [] }, false, 'clearNotifications');\n          },\n          \n          // Focus management\n          setFocusTrap: (elementId) => {\n            set({ focusTrap: elementId }, false, 'setFocusTrap');\n          },\n          \n          announce: (message) => {\n            set((state) => ({\n              announcements: [...state.announcements, message]\n            }), false, 'announce');\n            \n            // Clear announcement after a short delay\n            setTimeout(() => {\n              set((state) => ({\n                announcements: state.announcements.filter(ann => ann !== message)\n              }), false, 'clearAnnouncement');\n            }, 1000);\n          },\n          \n          clearAnnouncements: () => {\n            set({ announcements: [] }, false, 'clearAnnouncements');\n          },\n          \n          // Keyboard shortcuts\n          registerShortcut: (key, handler) => {\n            set((state) => ({\n              activeShortcuts: { ...state.activeShortcuts, [key]: handler }\n            }), false, 'registerShortcut');\n          },\n          \n          unregisterShortcut: (key) => {\n            set((state) => {\n              const { [key]: removed, ...remaining } = state.activeShortcuts;\n              return { activeShortcuts: remaining };\n            }, false, 'unregisterShortcut');\n          },\n          \n          setShortcutsEnabled: (enabled) => {\n            set({ shortcutsEnabled: enabled }, false, 'setShortcutsEnabled');\n          },\n          \n          // Layout\n          setLayout: (layout) => {\n            set({ layout }, false, 'setLayout');\n            \n            if (typeof window !== 'undefined') {\n              document.documentElement.setAttribute('data-layout', layout);\n            }\n          },\n          \n          setHeaderVisible: (visible) => {\n            set({ headerVisible: visible }, false, 'setHeaderVisible');\n          },\n          \n          setFooterVisible: (visible) => {\n            set({ footerVisible: visible }, false, 'setFooterVisible');\n          }\n        }),\n        {\n          name: 'describe-it-ui-store',\n          partialize: (state) => ({\n            theme: state.theme,\n            colorScheme: state.colorScheme,\n            fontSize: state.fontSize,\n            reduceMotion: state.reduceMotion,\n            highContrast: state.highContrast,\n            sidebarCollapsed: state.sidebarCollapsed,\n            layout: state.layout\n          }),\n          syncAcrossTabs: true\n        }\n      )\n    ),\n    { name: 'UIStore' }\n  )\n);\n\n// Optimized selectors\nconst modalSelector = createShallowSelector((state: UIState) => ({\n  modals: state.modals,\n  topModal: state.modals[0] || null,\n  hasModals: state.modals.length > 0\n}));\n\nconst themeSelector = createShallowSelector((state: UIState) => ({\n  theme: state.theme,\n  colorScheme: state.colorScheme,\n  fontSize: state.fontSize,\n  reduceMotion: state.reduceMotion,\n  highContrast: state.highContrast\n}));\n\nconst navigationSelector = createShallowSelector((state: UIState) => ({\n  sidebarOpen: state.sidebarOpen,\n  sidebarCollapsed: state.sidebarCollapsed,\n  breadcrumbs: state.breadcrumbs,\n  currentRoute: state.currentRoute\n}));\n\nconst notificationsSelector = createShallowSelector((state: UIState) => ({\n  notifications: state.notifications,\n  hasNotifications: state.notifications.length > 0\n}));\n\nconst loadingSelector = createShallowSelector((state: UIState) => ({\n  globalLoading: state.globalLoading,\n  loadingStates: state.loadingStates,\n  loadingMessages: state.loadingMessages,\n  isLoading: state.globalLoading || Object.values(state.loadingStates).some(Boolean)\n}));\n\n// Hooks\nexport const useModals = () => modalSelector(useUIStore);\nexport const useTheme = () => themeSelector(useUIStore);\nexport const useNavigation = () => navigationSelector(useUIStore);\nexport const useNotifications = () => notificationsSelector(useUIStore);\nexport const useLoading = () => loadingSelector(useUIStore);\n\nexport const useUIActions = () => useUIStore((state) => ({\n  // Modals\n  openModal: state.openModal,\n  closeModal: state.closeModal,\n  closeAllModals: state.closeAllModals,\n  closeTopModal: state.closeTopModal,\n  \n  // Navigation\n  setSidebarOpen: state.setSidebarOpen,\n  toggleSidebar: state.toggleSidebar,\n  setBreadcrumbs: state.setBreadcrumbs,\n  \n  // Theme\n  setTheme: state.setTheme,\n  setColorScheme: state.setColorScheme,\n  setFontSize: state.setFontSize,\n  \n  // Notifications\n  addNotification: state.addNotification,\n  removeNotification: state.removeNotification,\n  \n  // Loading\n  setLoadingState: state.setLoadingState,\n  setGlobalLoading: state.setGlobalLoading\n}));\n\n// Keyboard shortcut hook\nexport const useKeyboardShortcuts = () => {\n  const { shortcutsEnabled, activeShortcuts } = useUIStore((state) => ({\n    shortcutsEnabled: state.shortcutsEnabled,\n    activeShortcuts: state.activeShortcuts\n  }));\n  \n  const { registerShortcut, unregisterShortcut } = useUIActions();\n  \n  React.useEffect(() => {\n    if (!shortcutsEnabled || typeof window === 'undefined') return;\n    \n    const handleKeyDown = (event: KeyboardEvent) => {\n      const key = `${event.ctrlKey ? 'ctrl+' : ''}${event.shiftKey ? 'shift+' : ''}${event.altKey ? 'alt+' : ''}${event.key.toLowerCase()}`;\n      \n      if (activeShortcuts[key]) {\n        event.preventDefault();\n        activeShortcuts[key]();\n      }\n    };\n    \n    window.addEventListener('keydown', handleKeyDown);\n    \n    return () => {\n      window.removeEventListener('keydown', handleKeyDown);\n    };\n  }, [shortcutsEnabled, activeShortcuts]);\n  \n  return { registerShortcut, unregisterShortcut };\n};\n\n// Focus trap hook\nexport const useFocusTrap = (elementId: string) => {\n  const { setFocusTrap } = useUIActions();\n  \n  React.useEffect(() => {\n    setFocusTrap(elementId);\n    return () => setFocusTrap(null);\n  }, [elementId, setFocusTrap]);\n};