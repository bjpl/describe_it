import { CategorizedPhrase, VocabularySet, SavedPhrase } from "@/types/api";
import { ReviewItem, StudyStatistics } from "@/lib/algorithms/spacedRepetition";
import { StudySession } from "@/lib/storage/vocabularyStorage";

export interface VocabularyBuilderProps {
  savedPhrases: CategorizedPhrase[];
  onUpdatePhrases: (phrases: CategorizedPhrase[]) => void;
}

export interface ActiveStudySession {
  currentIndex: number;
  correctAnswers: number;
  totalAnswers: number;
  isActive: boolean;
  mode: "flashcards" | "quiz" | "review";
  reviewItems?: ReviewItem[];
  startTime: Date;
}

export interface ViewMode {
  current: "sets" | "study" | "statistics" | "settings";
  studyMode?: "flashcards" | "quiz" | "review";
}

export interface VocabularyListProps {
  vocabularySets: VocabularySet[];
  reviewItems: ReviewItem[];
  statistics: StudyStatistics;
  onStartStudySession: (mode: "flashcards" | "quiz" | "review", setId: string) => void;
  onExportSet: (set: VocabularySet, format: "json" | "csv") => void;
  onDeleteSet: (setId: string) => void;
  calculateProgress: (set: VocabularySet) => number;
}

export interface VocabularyFormProps {
  show: boolean;
  newSetName: string;
  savedPhrasesCount: number;
  onSetNameChange: (name: string) => void;
  onCreateSet: () => void;
  onCancel: () => void;
}

export interface VocabularyActionsProps {
  savedPhrases: CategorizedPhrase[];
  showCreateSet: boolean;
  viewMode: ViewMode;
  onImportSet: () => void;
  onShowCreateSet: () => void;
}

export interface VocabularyFiltersProps {
  vocabularySets: VocabularySet[];
  searchTerm: string;
  sortBy: "name" | "created" | "progress" | "size";
  sortOrder: "asc" | "desc";
  onSearchChange: (term: string) => void;
  onSortChange: (sortBy: string, sortOrder: string) => void;
}