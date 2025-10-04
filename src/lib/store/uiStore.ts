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
  rightPanelProps?: Record<string, any>;
  bottomPanelOpen: boolean;
  bottomPanelContent: string | null;
  bottomPanelProps?: Record<string, any>;
  
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
};

export const useUIStore = create<UIState>()(
  devtools(
    subscribeWithSelector(
      ssrPersist(
        (set, get) => ({
          ...defaultUIState,
          
          // Modal management
          openModal: (modalData) => {
            const id = `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const modal: Modal = {
              ...modalData,
              id,
              priority: modalData.priority || 0
            };

            set((state: UIState) => ({
              modals: [...state.modals, modal].sort((a, b) => b.priority - a.priority),
              modalHistory: [...state.modalHistory, id]
            }), false, 'openModal');

            return id;
          },

          closeModal: (id) => {
            set((state: UIState) => ({
              modals: state.modals.filter((modal: Modal) => modal.id !== id),
              modalHistory: state.modalHistory.filter((modalId: string) => modalId !== id)
            }), false, 'closeModal');
          },

          closeAllModals: () => {
            set({ modals: [], modalHistory: [] }, false, 'closeAllModals');
          },

          closeTopModal: () => {
            set((state: UIState) => {
              if (state.modals.length === 0) return state;

              const topModal = state.modals[0];
              if (topModal.persistent) return state;

              return {
                modals: state.modals.slice(1),
                modalHistory: state.modalHistory.filter((id: string) => id !== topModal.id)
              };
            }, false, 'closeTopModal');
          },

          updateModal: (id, updates) => {
            set((state: UIState) => ({
              modals: state.modals.map((modal: Modal) =>
                modal.id === id ? { ...modal, ...updates } : modal
              )
            }), false, 'updateModal');
          },
          
          // Navigation
          setSidebarOpen: (open) => {
            set({ sidebarOpen: open }, false, 'setSidebarOpen');
          },
          
          toggleSidebar: () => {
            set((state: UIState) => ({ sidebarOpen: !state.sidebarOpen }), false, 'toggleSidebar');
          },

          setSidebarCollapsed: (collapsed) => {
            set({ sidebarCollapsed: collapsed }, false, 'setSidebarCollapsed');
          },

          setBreadcrumbs: (breadcrumbs) => {
            set({ breadcrumbs }, false, 'setBreadcrumbs');
          },

          addBreadcrumb: (item) => {
            set((state: UIState) => ({
              breadcrumbs: [...state.breadcrumbs, item]
            }), false, 'addBreadcrumb');
          },
          
          setCurrentRoute: (route) => {
            set({ currentRoute: route }, false, 'setCurrentRoute');
          },
          
          // Theme
          setTheme: (theme) => {
            set({ theme }, false, 'setTheme');
            
            // Apply theme to document
            if (typeof window !== 'undefined') {
              const root = document.documentElement;
              root.setAttribute('data-theme', theme);
              
              if (theme === 'auto') {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                root.classList.toggle('dark', prefersDark);
              } else {
                root.classList.toggle('dark', theme === 'dark');
              }
            }
          },
          
          setColorScheme: (scheme) => {
            set({ colorScheme: scheme }, false, 'setColorScheme');
            
            if (typeof window !== 'undefined') {
              document.documentElement.setAttribute('data-color-scheme', scheme);
            }
          },
          
          setFontSize: (size) => {
            set({ fontSize: size }, false, 'setFontSize');
            
            if (typeof window !== 'undefined') {
              document.documentElement.setAttribute('data-font-size', size);
            }
          },
          
          toggleReduceMotion: () => {
            set((state) => {
              const newValue = !state.reduceMotion;
              
              if (typeof window !== 'undefined') {
                document.documentElement.setAttribute('data-reduce-motion', String(newValue));
              }
              
              return { reduceMotion: newValue };
            }, false, 'toggleReduceMotion');
          },
          
          toggleHighContrast: () => {
            set((state) => {
              const newValue = !state.highContrast;
              
              if (typeof window !== 'undefined') {
                document.documentElement.setAttribute('data-high-contrast', String(newValue));
              }
              
              return { highContrast: newValue };
            }, false, 'toggleHighContrast');
          },
          
          // Panels
          openRightPanel: (content, props) => {
            set({ 
              rightPanelOpen: true, 
              rightPanelContent: content,
              rightPanelProps: props 
            }, false, 'openRightPanel');
          },
          
          closeRightPanel: () => {
            set({ 
              rightPanelOpen: false, 
              rightPanelContent: null,
              rightPanelProps: undefined 
            }, false, 'closeRightPanel');
          },
          
          toggleRightPanel: () => {
            set((state) => ({ rightPanelOpen: !state.rightPanelOpen }), false, 'toggleRightPanel');
          },
          
          openBottomPanel: (content, props) => {
            set({ 
              bottomPanelOpen: true, 
              bottomPanelContent: content,
              bottomPanelProps: props 
            }, false, 'openBottomPanel');
          },
          
          closeBottomPanel: () => {
            set({ 
              bottomPanelOpen: false, 
              bottomPanelContent: null,
              bottomPanelProps: undefined 
            }, false, 'closeBottomPanel');
          },
          
          toggleBottomPanel: () => {
            set((state) => ({ bottomPanelOpen: !state.bottomPanelOpen }), false, 'toggleBottomPanel');
          },
          
          // Loading
          setGlobalLoading: (loading) => {
            set({ globalLoading: loading }, false, 'setGlobalLoading');
          },
          
          setLoadingState: (key, loading, message) => {
            set((state) => ({
              loadingStates: { ...state.loadingStates, [key]: loading },
              loadingMessages: message 
                ? { ...state.loadingMessages, [key]: message }
                : state.loadingMessages
            }), false, 'setLoadingState');
          },
          
          clearLoadingStates: () => {
            set({ loadingStates: {}, loadingMessages: {} }, false, 'clearLoadingStates');
          },
          
          // Notifications
          addNotification: (notificationData) => {
            const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const notification: Notification = {
              ...notificationData,
              id,
              timestamp: new Date()
            };
            
            set((state) => {
              const newNotifications = [notification, ...state.notifications];
              
              // Keep only maxNotifications
              const trimmedNotifications = newNotifications.slice(0, state.maxNotifications);
              
              return { notifications: trimmedNotifications };
            }, false, 'addNotification');
            
            // Auto-remove notification if duration is set
            if (notification.duration && notification.duration > 0) {
              setTimeout(() => {
                get().removeNotification(id);
              }, notification.duration);
            }
            
            return id;
          },
          
          removeNotification: (id) => {
            set((state) => ({
              notifications: state.notifications.filter(notification => notification.id !== id)
            }), false, 'removeNotification');
          },
          
          clearNotifications: () => {
            set({ notifications: [] }, false, 'clearNotifications');
          },
          
          // Focus management
          setFocusTrap: (elementId) => {
            set({ focusTrap: elementId }, false, 'setFocusTrap');
          },
          
          announce: (message) => {
            set((state) => ({
              announcements: [...state.announcements, message]
            }), false, 'announce');
            
            // Clear announcement after a short delay
            setTimeout(() => {
              set((state) => ({
                announcements: state.announcements.filter(ann => ann !== message)
              }), false, 'clearAnnouncement');
            }, 1000);
          },
          
          clearAnnouncements: () => {
            set({ announcements: [] }, false, 'clearAnnouncements');
          },
          
          // Keyboard shortcuts
          registerShortcut: (key, handler) => {
            set((state) => ({
              activeShortcuts: { ...state.activeShortcuts, [key]: handler }
            }), false, 'registerShortcut');
          },
          
          unregisterShortcut: (key) => {
            set((state) => {
              const { [key]: removed, ...remaining } = state.activeShortcuts;
              return { activeShortcuts: remaining };
            }, false, 'unregisterShortcut');
          },
          
          setShortcutsEnabled: (enabled) => {
            set({ shortcutsEnabled: enabled }, false, 'setShortcutsEnabled');
          },
          
          // Layout
          setLayout: (layout) => {
            set({ layout }, false, 'setLayout');
            
            if (typeof window !== 'undefined') {
              document.documentElement.setAttribute('data-layout', layout);
            }
          },
          
          setHeaderVisible: (visible) => {
            set({ headerVisible: visible }, false, 'setHeaderVisible');
          },
          
          setFooterVisible: (visible) => {
            set({ footerVisible: visible }, false, 'setFooterVisible');
          }
        }),
        {
          name: 'describe-it-ui-store',
          partialize: (state) => ({
            theme: state.theme,
            colorScheme: state.colorScheme,
            fontSize: state.fontSize,
            reduceMotion: state.reduceMotion,
            highContrast: state.highContrast,
            sidebarCollapsed: state.sidebarCollapsed,
            layout: state.layout
          }),
          syncAcrossTabs: true
        }
      )
    ),
    { name: 'UIStore' }
  )
);

// Optimized selectors
const modalSelector = createShallowSelector((state: UIState) => ({
  modals: state.modals,
  topModal: state.modals[0] || null,
  hasModals: state.modals.length > 0
}));

const themeSelector = createShallowSelector((state: UIState) => ({
  theme: state.theme,
  colorScheme: state.colorScheme,
  fontSize: state.fontSize,
  reduceMotion: state.reduceMotion,
  highContrast: state.highContrast
}));

const navigationSelector = createShallowSelector((state: UIState) => ({
  sidebarOpen: state.sidebarOpen,
  sidebarCollapsed: state.sidebarCollapsed,
  breadcrumbs: state.breadcrumbs,
  currentRoute: state.currentRoute
}));

const notificationsSelector = createShallowSelector((state: UIState) => ({
  notifications: state.notifications,
  hasNotifications: state.notifications.length > 0
}));

const loadingSelector = createShallowSelector((state: UIState) => ({
  globalLoading: state.globalLoading,
  loadingStates: state.loadingStates,
  loadingMessages: state.loadingMessages,
  isLoading: state.globalLoading || Object.values(state.loadingStates).some(Boolean)
}));

// Hooks
export const useModals = () => modalSelector(useUIStore);
export const useTheme = () => themeSelector(useUIStore);
export const useNavigation = () => navigationSelector(useUIStore);
export const useNotifications = () => notificationsSelector(useUIStore);
export const useLoading = () => loadingSelector(useUIStore);

export const useUIActions = () => useUIStore((state) => ({
  // Modals
  openModal: state.openModal,
  closeModal: state.closeModal,
  closeAllModals: state.closeAllModals,
  closeTopModal: state.closeTopModal,
  
  // Navigation
  setSidebarOpen: state.setSidebarOpen,
  toggleSidebar: state.toggleSidebar,
  setBreadcrumbs: state.setBreadcrumbs,
  
  // Theme
  setTheme: state.setTheme,
  setColorScheme: state.setColorScheme,
  setFontSize: state.setFontSize,
  
  // Notifications
  addNotification: state.addNotification,
  removeNotification: state.removeNotification,
  
  // Loading
  setLoadingState: state.setLoadingState,
  setGlobalLoading: state.setGlobalLoading
}));

// Keyboard shortcut hook
export const useKeyboardShortcuts = () => {
  const { shortcutsEnabled, activeShortcuts } = useUIStore((state) => ({
    shortcutsEnabled: state.shortcutsEnabled,
    activeShortcuts: state.activeShortcuts
  }));
  
  const { registerShortcut, unregisterShortcut } = useUIActions();
  
  React.useEffect(() => {
    if (!shortcutsEnabled || typeof window === 'undefined') return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = `${event.ctrlKey ? 'ctrl+' : ''}${event.shiftKey ? 'shift+' : ''}${event.altKey ? 'alt+' : ''}${event.key.toLowerCase()}`;
      
      if (activeShortcuts[key]) {
        event.preventDefault();
        activeShortcuts[key]();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcutsEnabled, activeShortcuts]);
  
  return { registerShortcut, unregisterShortcut };
};

// Focus trap hook
export const useFocusTrap = (elementId: string) => {
  const { setFocusTrap } = useUIActions();
  
  React.useEffect(() => {
    setFocusTrap(elementId);
    return () => setFocusTrap(null);
  }, [elementId, setFocusTrap]);
};