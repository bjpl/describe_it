/**
 * Shared types for Gamma-3 Vocabulary Extractor
 */

import { CategorizedPhrase, UnsplashImage } from "@/types/api";
import { PhraseCategory } from "@/lib/services/phraseExtractor";

export interface GammaVocabularyExtractorProps {
  selectedImage: UnsplashImage | null;
  descriptionText: string | null;
  style: "narrativo" | "poetico" | "academico" | "conversacional" | "infantil";
  onPhrasesUpdated?: (phrases: CategorizedPhrase[]) => void;
  coordinateWithAlpha1?: boolean;
  activeDescriptionTab?: string;
  allDescriptions?: Record<string, string>;
}

export interface ExtractorState {
  isExtracting: boolean;
  error: string | null;
  categorizedPhrases: Record<PhraseCategory, CategorizedPhrase[]>;
  selectedPhrases: Set<string>;
  activeCategories: Set<PhraseCategory>;
  searchTerm: string;
  showSettings: boolean;
  addedPhrases: Set<string>;
}

export interface ExtractionSettings {
  difficulty: "beginner" | "intermediate" | "advanced";
  maxPhrases: number;
  autoAddSmallExtractions: boolean;
  showTranslations: boolean;
  groupBySimilarity: boolean;
  enabledCategories: Set<PhraseCategory>;
}

export interface ExtractionStatsData {
  totalExtractions: number;
  recentExtractions: CategorizedPhrase[];
}
