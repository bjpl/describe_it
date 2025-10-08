// Export all stores and their selectors for easy importing

// Core Application Stores
export {
  useAppStore,
  useCurrentImage,
  useSidebarState,
  useActiveTab,
  usePreferences,
  useSearchHistory,
  useAppError,
} from "./appStore";

export {
  useSessionStore,
  useSession,
  useSessionStatus,
  useSessionActions,
  useActivitySummary,
} from "./sessionStore";

// Enhanced State Management Stores
export {
  useAPIKeysStore,
  useAPIKeys,
  useActiveAPIKeys,
  useAPIKeyActions,
  useAPIKeyUsage,
  useAPIKeyValidation,
} from "./apiKeysStore";

export {
  useFormStore,
  useForm,
  useField,
  useFormActions,
  validationRules,
  type FieldConfig,
  type FormState,
  type ValidationRule,
} from "./formStore";

export {
  useUIStore,
  useModals,
  useTheme,
  useNavigation,
  useNotifications,
  useLoading,
  useUIActions,
  useKeyboardShortcuts,
  useFocusTrap,
  type Modal,
  type Notification,
  type BreadcrumbItem,
} from "./uiStore";

// Tab sync, undo/redo, and debug stores are optional and may not exist in all environments
// Only export if the modules exist
// export {
//   useTabSyncStore,
//   useTabSync,
//   useTabSyncActions,
//   useStoreSyncRegistration,
//   useAutoTabSync,
//   type ConflictStrategy,
//   type SyncConfig,
// } from "./tabSyncStore";

// export {
//   useUndoRedoStore,
//   useUndoRedo,
//   useUndoRedoActions,
//   useUndoRedoRegistration,
//   useUndoRedoShortcuts,
//   type HistoryEntry,
//   type HistoryBranch,
// } from "./undoRedoStore";

// export {
//   useDebugStore,
//   useDebug,
//   useDebugActions,
//   useDebugRegistration,
//   connectDebugToDevTools,
//   type ActionLog,
//   type PerformanceMetrics,
//   type StateDiff,
// } from "./debugStore";

// Middleware
export {
  ssrPersist,
  createSSRStorage,
  createSecureStorage,
  useHydration,
  storageAdapters,
} from "./middleware/ssrPersist";
