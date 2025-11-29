// Core hooks
export { useImageSearch } from "./useImageSearch";
export { useDescriptions } from "./useDescriptions";
export { useQuestionAnswer } from "./useQuestionAnswer";
export { usePhraseExtraction } from "./usePhraseExtraction";
export { useImageViewer } from "./useImageViewer";
export { useSession } from "./useSession";
export { useExport } from "./useExport";
export { useDebounce } from "./useDebounce";
export { useLocalStorage } from "./useLocalStorage";
export { usePagination } from "./usePagination";
export { useNetworkStatus } from "./useNetworkStatus";
export { useSettings } from "./useSettings";
export {
  useKeyboardShortcuts,
  createAppShortcuts,
  type KeyboardShortcut,
} from "./useKeyboardShortcuts";
export { useVocabulary } from "./useVocabulary";
export {
  useQASystem,
  type QAQuestion,
  type QAResponse,
  type QASessionData,
  type QASystemConfig,
  type LearningInsights,
} from "./useQASystem";

// Session logging hooks
export {
  useSessionLogger,
  withSessionLogging,
  useSearchLogging,
  useImageInteractionLogging,
  useContentGenerationLogging,
  useSessionAnalytics,
} from "./useSessionLogger";

// Error handling hooks
export { useErrorHandler, useAsyncErrorHandler } from "./useErrorHandler";
