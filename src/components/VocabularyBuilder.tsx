"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  BookOpen,
  Trash2,
  Download,
  Upload,
  Play,
  Pause,
  RotateCcw,
  Star,
  Award,
  Clock,
  BarChart3,
  Settings,
  FileDown,
  FileUp,
  TrendingUp,
} from "lucide-react";
import { CategorizedPhrase, VocabularySet, SavedPhrase } from "@/types/api";
import {
  getDifficultyColor,
  getCategoryColor,
} from "@/lib/utils/phrase-helpers";
import FlashcardComponent from "./FlashcardComponent";
import QuizComponent, { QuizResults } from "./QuizComponent";
import ProgressStatistics from "./ProgressStatistics";
import SpacedRepetitionSystem, {
  ReviewItem,
  StudyStatistics,
} from "@/lib/algorithms/spacedRepetition";
import VocabularyStorage, {
  StudySession,
} from "@/lib/storage/vocabularyStorage";

interface VocabularyBuilderProps {
  savedPhrases: CategorizedPhrase[];
  onUpdatePhrases: (phrases: CategorizedPhrase[]) => void;
}

interface ActiveStudySession {
  currentIndex: number;
  correctAnswers: number;
  totalAnswers: number;
  isActive: boolean;
  mode: "flashcards" | "quiz" | "review";
  reviewItems?: ReviewItem[];
  startTime: Date;
}

interface ViewMode {
  current: "sets" | "study" | "statistics" | "settings";
  studyMode?: "flashcards" | "quiz" | "review";
}

const VocabularyBuilder: React.FC<VocabularyBuilderProps> = ({
  savedPhrases,
  onUpdatePhrases,
}) => {
  const [vocabularySets, setVocabularySets] = useState<VocabularySet[]>([]);
  const [currentSet, setCurrentSet] = useState<VocabularySet | null>(null);
  const [studySession, setStudySession] = useState<ActiveStudySession>({
    currentIndex: 0,
    correctAnswers: 0,
    totalAnswers: 0,
    isActive: false,
    mode: "flashcards",
    startTime: new Date(),
  });
  const [showAnswer, setShowAnswer] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  const [showCreateSet, setShowCreateSet] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>({ current: "sets" });
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [studyHistory, setStudyHistory] = useState<StudySession[]>([]);
  const [statistics, setStatistics] = useState<StudyStatistics>({
    totalReviews: 0,
    correctReviews: 0,
    averageQuality: 0,
    studyStreak: 0,
    masteredItems: 0,
    itemsToReview: 0,
    estimatedTime: 0,
  });

  // Load data from localStorage on component mount
  useEffect(() => {
    const loadedSets = VocabularyStorage.loadVocabularySets();
    const loadedReviewItems = VocabularyStorage.loadReviewItems();
    const loadedHistory = VocabularyStorage.getStudyHistory();

    setVocabularySets(loadedSets);
    setReviewItems(loadedReviewItems);
    setStudyHistory(loadedHistory);

    // Calculate statistics
    const stats = SpacedRepetitionSystem.calculateStatistics(loadedReviewItems);
    setStatistics(stats);
  }, []);

  // Create new vocabulary set
  const createVocabularySet = useCallback(() => {
    if (!newSetName.trim() || savedPhrases.length === 0) return;

    const newSet: VocabularySet = {
      id: `set_${Date.now()}`,
      name: newSetName,
      description: `Study set created from ${savedPhrases.length} saved phrases`,
      phrases: savedPhrases.map((phrase) => ({
        ...phrase,
        savedAt: new Date(),
        studyProgress: {
          correctAnswers: 0,
          totalAttempts: 0,
        },
      })) as SavedPhrase[],
      createdAt: new Date(),
      lastModified: new Date(),
      studyStats: {
        totalPhrases: savedPhrases.length,
        masteredPhrases: 0,
        reviewsDue: savedPhrases.length,
        averageProgress: 0,
      },
    };

    // Save to storage
    const updatedSets = [...vocabularySets, newSet];
    setVocabularySets(updatedSets);
    VocabularyStorage.saveVocabularySets(updatedSets);

    // Create review items for spaced repetition
    const newReviewItems = newSet.phrases.map((phrase) =>
      SpacedRepetitionSystem.createReviewItem(
        phrase.id,
        phrase.phrase,
        phrase.definition,
      ),
    );
    const updatedReviewItems = [...reviewItems, ...newReviewItems];
    setReviewItems(updatedReviewItems);
    VocabularyStorage.saveReviewItems(updatedReviewItems);

    setCurrentSet(newSet);
    setNewSetName("");
    setShowCreateSet(false);
  }, [newSetName, savedPhrases, vocabularySets, reviewItems]);

  // Start study session
  const startStudySession = useCallback(
    (mode: "flashcards" | "quiz" | "review", setId?: string) => {
      const targetSet = setId
        ? vocabularySets.find((set) => set.id === setId)
        : currentSet;
      if (!targetSet || targetSet.phrases.length === 0) return;

      let sessionReviewItems: ReviewItem[] = [];

      if (mode === "review") {
        // Get items due for review using spaced repetition
        const setReviewItems = reviewItems.filter((item) =>
          targetSet.phrases.some((phrase) => phrase.id === item.id),
        );
        sessionReviewItems = SpacedRepetitionSystem.getItemsDueForReview(
          setReviewItems,
          20,
        );

        if (sessionReviewItems.length === 0) {
          alert("No items are due for review right now!");
          return;
        }
      }

      setCurrentSet(targetSet);
      setStudySession({
        currentIndex: 0,
        correctAnswers: 0,
        totalAnswers: 0,
        isActive: true,
        mode,
        reviewItems: sessionReviewItems,
        startTime: new Date(),
      });
      setShowAnswer(false);
      setViewMode({ current: "study", studyMode: mode });
    },
    [vocabularySets, currentSet, reviewItems],
  );

  // Handle answer in study session (for flashcards)
  const handleFlashcardAnswer = useCallback(
    (quality: number) => {
      if (!currentSet || !studySession.isActive) return;

      const currentPhrase = currentSet.phrases[studySession.currentIndex];

      // Update spaced repetition item
      const reviewItem = reviewItems.find(
        (item) => item.id === currentPhrase.id,
      );
      if (reviewItem) {
        const updatedReviewItem = SpacedRepetitionSystem.calculateNextReview(
          reviewItem,
          quality,
        );
        const updatedReviewItems = reviewItems.map((item) =>
          item.id === reviewItem.id ? updatedReviewItem : item,
        );
        setReviewItems(updatedReviewItems);
        VocabularyStorage.saveReviewItems(updatedReviewItems);
      }

      // Update phrase progress
      const isCorrect = quality >= 3;
      const updatedPhrase: SavedPhrase = {
        ...currentPhrase,
        studyProgress: {
          ...currentPhrase.studyProgress,
          totalAttempts: currentPhrase.studyProgress.totalAttempts + 1,
          correctAnswers:
            currentPhrase.studyProgress.correctAnswers + (isCorrect ? 1 : 0),
          lastReviewed: new Date(),
          nextReview: reviewItem
            ? SpacedRepetitionSystem.calculateNextReview(reviewItem, quality)
                .nextReview
            : undefined,
        },
      };

      // Update the set
      const updatedSet: VocabularySet = {
        ...currentSet,
        phrases: currentSet.phrases.map((p) =>
          p.id === currentPhrase.id ? updatedPhrase : p,
        ),
        lastModified: new Date(),
      };

      const updatedSets = vocabularySets.map((set) =>
        set.id === updatedSet.id ? updatedSet : set,
      );
      setVocabularySets(updatedSets);
      setCurrentSet(updatedSet);
      VocabularyStorage.saveVocabularySets(updatedSets);

      // Update session stats
      const newCorrectAnswers =
        studySession.correctAnswers + (isCorrect ? 1 : 0);
      const newTotalAnswers = studySession.totalAnswers + 1;

      setStudySession((prev) => ({
        ...prev,
        correctAnswers: newCorrectAnswers,
        totalAnswers: newTotalAnswers,
      }));
    },
    [currentSet, studySession, reviewItems, vocabularySets],
  );

  // Handle quiz completion
  const handleQuizComplete = useCallback(
    (results: QuizResults) => {
      if (!currentSet) return;

      // Save study session
      const sessionData: StudySession = {
        id: `session_${Date.now()}`,
        date: new Date().toISOString().split("T")[0],
        duration: Math.round(
          (new Date().getTime() - studySession.startTime.getTime()) /
            (1000 * 60),
        ),
        itemsStudied: results.totalQuestions,
        correctAnswers: results.correctAnswers,
        averageQuality: results.accuracy / 20, // Convert percentage to 0-5 scale
        mode: "quiz",
      };

      const updatedHistory = [...studyHistory, sessionData];
      setStudyHistory(updatedHistory);
      VocabularyStorage.addStudySession(sessionData);

      // Update statistics
      const updatedReviewItems = reviewItems.map((item) => {
        const questionResult = results.questionsWithAnswers.find(
          (qa) => qa.question.phrase.id === item.id,
        );
        if (questionResult) {
          const quality = SpacedRepetitionSystem.responseToQuality(
            questionResult.isCorrect,
            questionResult.isCorrect ? "high" : "low",
          );
          return SpacedRepetitionSystem.calculateNextReview(item, quality);
        }
        return item;
      });

      setReviewItems(updatedReviewItems);
      VocabularyStorage.saveReviewItems(updatedReviewItems);

      const stats =
        SpacedRepetitionSystem.calculateStatistics(updatedReviewItems);
      setStatistics(stats);

      // End session
      setStudySession((prev) => ({ ...prev, isActive: false }));
      setViewMode({ current: "sets" });
    },
    [currentSet, studySession, studyHistory, reviewItems],
  );

  // Navigation helpers
  const navigateToNext = useCallback(() => {
    if (
      !currentSet ||
      studySession.currentIndex >= currentSet.phrases.length - 1
    )
      return;

    setStudySession((prev) => ({
      ...prev,
      currentIndex: prev.currentIndex + 1,
    }));
    setShowAnswer(false);
  }, [currentSet, studySession.currentIndex]);

  const navigateToPrevious = useCallback(() => {
    if (studySession.currentIndex <= 0) return;

    setStudySession((prev) => ({
      ...prev,
      currentIndex: prev.currentIndex - 1,
    }));
    setShowAnswer(false);
  }, [studySession.currentIndex]);

  // Export vocabulary set
  const exportSet = useCallback(
    (set: VocabularySet, format: "json" | "csv" = "json") => {
      if (format === "csv") {
        const csvData = VocabularyStorage.exportSetAsCSV(set);
        const dataUri =
          "data:text/csv;charset=utf-8," + encodeURIComponent(csvData);
        const exportFileDefaultName = `vocabulary-${set.name.toLowerCase().replace(/\s+/g, "-")}.csv`;

        const linkElement = document.createElement("a");
        linkElement.setAttribute("href", dataUri);
        linkElement.setAttribute("download", exportFileDefaultName);
        linkElement.click();
      } else {
        const dataStr = JSON.stringify(set, null, 2);
        const dataUri =
          "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
        const exportFileDefaultName = `vocabulary-${set.name.toLowerCase().replace(/\s+/g, "-")}.json`;

        const linkElement = document.createElement("a");
        linkElement.setAttribute("href", dataUri);
        linkElement.setAttribute("download", exportFileDefaultName);
        linkElement.click();
      }
    },
    [],
  );

  // Import vocabulary set
  const importSet = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.csv";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (!content) return;

        try {
          if (file.name.endsWith(".csv")) {
            const setName = prompt("Enter a name for the imported set:");
            if (!setName) return;

            const importedSet = VocabularyStorage.importSetFromCSV(
              content,
              setName,
            );
            if (importedSet) {
              const updatedSets = [...vocabularySets, importedSet];
              setVocabularySets(updatedSets);
              VocabularyStorage.saveVocabularySets(updatedSets);

              // Create review items
              const newReviewItems = importedSet.phrases.map((phrase) =>
                SpacedRepetitionSystem.createReviewItem(
                  phrase.id,
                  phrase.phrase,
                  phrase.definition,
                ),
              );
              const updatedReviewItems = [...reviewItems, ...newReviewItems];
              setReviewItems(updatedReviewItems);
              VocabularyStorage.saveReviewItems(updatedReviewItems);

              alert("Set imported successfully!");
            } else {
              alert("Failed to import CSV file. Please check the format.");
            }
          } else {
            const importedSet: VocabularySet = JSON.parse(content);
            const updatedSets = [...vocabularySets, importedSet];
            setVocabularySets(updatedSets);
            VocabularyStorage.saveVocabularySets(updatedSets);
            alert("Set imported successfully!");
          }
        } catch (error) {
          alert("Failed to import file. Please check the format.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [vocabularySets, reviewItems]);

  // Calculate progress for a set
  const calculateProgress = useCallback((set: VocabularySet) => {
    if (set.phrases.length === 0) return 0;

    const totalProgress = set.phrases.reduce((sum, phrase) => {
      const attempts = phrase.studyProgress.totalAttempts;
      const correct = phrase.studyProgress.correctAnswers;
      return sum + (attempts > 0 ? correct / attempts : 0);
    }, 0);

    return Math.round((totalProgress / set.phrases.length) * 100);
  }, []);

  // Get current phrase in study session
  const currentPhrase = useMemo(() => {
    if (!currentSet || !studySession.isActive) return null;

    if (studySession.mode === "review" && studySession.reviewItems) {
      const reviewItem = studySession.reviewItems[studySession.currentIndex];
      return currentSet.phrases.find((phrase) => phrase.id === reviewItem?.id);
    }

    return currentSet.phrases[studySession.currentIndex];
  }, [currentSet, studySession]);

  // Delete vocabulary set
  const deleteVocabularySet = useCallback(
    (setId: string) => {
      const updatedSets = vocabularySets.filter((set) => set.id !== setId);
      setVocabularySets(updatedSets);
      VocabularyStorage.saveVocabularySets(updatedSets);
      VocabularyStorage.deleteVocabularySet(setId);

      if (currentSet?.id === setId) {
        setCurrentSet(null);
      }
    },
    [vocabularySets, currentSet],
  );

  return (
    <div className="space-y-6">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          Vocabulary Builder
        </h2>

        <div className="flex items-center gap-2">
          {/* Navigation buttons */}
          <button
            onClick={() => setViewMode({ current: "sets" })}
            className={`px-3 py-2 rounded-lg transition-colors ${
              viewMode.current === "sets"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
          >
            Study Sets
          </button>

          <button
            onClick={() => setViewMode({ current: "statistics" })}
            className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              viewMode.current === "statistics"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Statistics
          </button>

          {/* Import/Export buttons */}
          <button
            onClick={importSet}
            className="p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Import vocabulary set"
          >
            <FileUp className="h-5 w-5" />
          </button>

          {savedPhrases.length > 0 &&
            !showCreateSet &&
            viewMode.current === "sets" && (
              <button
                onClick={() => setShowCreateSet(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Study Set
              </button>
            )}
        </div>
      </div>

      {/* Create New Set */}
      {showCreateSet && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Create New Study Set</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Set Name
              </label>
              <input
                type="text"
                value={newSetName}
                onChange={(e) => setNewSetName(e.target.value)}
                placeholder="Enter study set name..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={createVocabularySet}
                disabled={!newSetName.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Set ({savedPhrases.length} phrases)
              </button>
              <button
                onClick={() => {
                  setShowCreateSet(false);
                  setNewSetName("");
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Study Session */}
      {viewMode.current === "study" &&
        studySession.isActive &&
        currentPhrase &&
        currentSet && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  {studySession.mode === "flashcards"
                    ? "Flashcards"
                    : studySession.mode === "quiz"
                      ? "Quiz"
                      : "Review"}{" "}
                  - {currentSet.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {studySession.mode === "review"
                    ? `Review session (${studySession.reviewItems?.length || 0} items due)`
                    : `${currentSet.phrases.length} items in set`}
                </p>
              </div>
              <button
                onClick={() => {
                  setStudySession((prev) => ({ ...prev, isActive: false }));
                  setViewMode({ current: "sets" });
                }}
                className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                End Session
              </button>
            </div>

            {studySession.mode === "flashcards" && (
              <FlashcardComponent
                phrase={currentPhrase}
                onAnswer={handleFlashcardAnswer}
                onNext={navigateToNext}
                onPrevious={navigateToPrevious}
                currentIndex={studySession.currentIndex}
                totalCount={
                  studySession.mode === "review"
                    ? studySession.reviewItems?.length || 0
                    : currentSet.phrases.length
                }
                showNavigation={true}
              />
            )}

            {studySession.mode === "quiz" && (
              <QuizComponent
                phrases={currentSet.phrases}
                onComplete={handleQuizComplete}
                questionCount={Math.min(20, currentSet.phrases.length)}
                timeLimit={600} // 10 minutes
                showHints={true}
              />
            )}

            {studySession.mode === "review" && (
              <FlashcardComponent
                phrase={currentPhrase}
                onAnswer={handleFlashcardAnswer}
                onNext={navigateToNext}
                onPrevious={navigateToPrevious}
                currentIndex={studySession.currentIndex}
                totalCount={studySession.reviewItems?.length || 0}
                showNavigation={true}
              />
            )}
          </div>
        )}

      {/* Statistics View */}
      {viewMode.current === "statistics" && (
        <ProgressStatistics
          vocabularySets={vocabularySets}
          studyHistory={studyHistory}
          statistics={statistics}
        />
      )}

      {/* Vocabulary Sets View */}
      {viewMode.current === "sets" && (
        <>
          {vocabularySets.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">My Study Sets</h3>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Clock className="h-4 w-4" />
                  <span>{statistics.itemsToReview} items due for review</span>
                </div>
              </div>

              <div className="grid gap-4">
                {vocabularySets.map((set) => {
                  const dueForReview = reviewItems.filter(
                    (item) =>
                      set.phrases.some((phrase) => phrase.id === item.id) &&
                      (!item.nextReview || item.nextReview <= new Date()),
                  ).length;

                  return (
                    <div
                      key={set.id}
                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {set.name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {set.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <span>{set.phrases.length} phrases</span>
                            <span>Progress: {calculateProgress(set)}%</span>
                            <span>
                              Created: {set.createdAt.toLocaleDateString()}
                            </span>
                            {dueForReview > 0 && (
                              <span className="text-orange-600 font-medium">
                                {dueForReview} due for review
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => exportSet(set, "csv")}
                            className="p-2 text-gray-400 hover:text-green-500 transition-colors"
                            title="Export as CSV"
                          >
                            <FileDown className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => exportSet(set, "json")}
                            className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                            title="Export as JSON"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  "Are you sure you want to delete this set?",
                                )
                              ) {
                                deleteVocabularySet(set.id);
                              }
                            }}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete set"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            startStudySession("flashcards", set.id)
                          }
                          className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1"
                        >
                          <Play className="h-3 w-3" />
                          Flashcards
                        </button>
                        <button
                          onClick={() => startStudySession("quiz", set.id)}
                          className="px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors flex items-center gap-1"
                        >
                          <Star className="h-3 w-3" />
                          Quiz
                        </button>
                        <button
                          onClick={() => startStudySession("review", set.id)}
                          className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1 ${
                            dueForReview > 0
                              ? "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50"
                              : "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50"
                          }`}
                        >
                          <RotateCcw className="h-3 w-3" />
                          Review {dueForReview > 0 && `(${dueForReview})`}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {viewMode.current === "sets" &&
        savedPhrases.length === 0 &&
        vocabularySets.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              No saved phrases yet.
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
              Save phrases from the extraction panel to start building your
              vocabulary.
            </p>
            <button
              onClick={importSet}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Import Vocabulary Set
            </button>
          </div>
        )}
    </div>
  );
};

export default VocabularyBuilder;
