"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  BookOpen,
  BarChart3,
} from "lucide-react";
import { CategorizedPhrase, VocabularySet, SavedPhrase } from "@/types/api";
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
import { safeParse, safeStringify, safeParseLocalStorage, safeSetLocalStorage } from "@/lib/utils/json-safe";
import {
  VocabularyList,
  VocabularyForm,
  VocabularyActions,
  VocabularyFilters,
  VocabularyEmptyState,
  type VocabularyBuilderProps,
  type ActiveStudySession,
  type ViewMode,
} from "./VocabularyBuilder/index";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "created" | "progress" | "size">("created");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
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
        const dataStr = safeStringify(set, null, 2);
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

  // Filter and sort vocabulary sets
  const filteredAndSortedSets = useMemo(() => {
    let filtered = vocabularySets;

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter((set) =>
        set.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        set.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "created":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "progress":
          comparison = calculateProgress(a) - calculateProgress(b);
          break;
        case "size":
          comparison = a.phrases.length - b.phrases.length;
          break;
        default:
          return 0;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [vocabularySets, searchTerm, sortBy, sortOrder, calculateProgress]);

  // Handle sort change
  const handleSortChange = useCallback((newSortBy: string, newSortOrder: string) => {
    setSortBy(newSortBy as "name" | "created" | "progress" | "size");
    setSortOrder(newSortOrder as "asc" | "desc");
  }, []);

  // Handle form actions
  const handleCancelCreateSet = useCallback(() => {
    setShowCreateSet(false);
    setNewSetName("");
  }, []);

  const handleShowCreateSet = useCallback(() => {
    setShowCreateSet(true);
  }, []);

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

  // Get current phrase in study session
  const currentPhrase = useMemo(() => {
    if (!currentSet || !studySession.isActive) return null;

    if (studySession.mode === "review" && studySession.reviewItems) {
      const reviewItem = studySession.reviewItems[studySession.currentIndex];
      return currentSet.phrases.find((phrase) => phrase.id === reviewItem?.id);
    }

    return currentSet.phrases[studySession.currentIndex];
  }, [currentSet, studySession]);

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

          <VocabularyActions
            savedPhrases={savedPhrases}
            showCreateSet={showCreateSet}
            viewMode={viewMode}
            onImportSet={importSet}
            onShowCreateSet={handleShowCreateSet}
          />
        </div>
      </div>

      {/* Create New Set Form */}
      <VocabularyForm
        show={showCreateSet}
        newSetName={newSetName}
        savedPhrasesCount={savedPhrases.length}
        onSetNameChange={setNewSetName}
        onCreateSet={createVocabularySet}
        onCancel={handleCancelCreateSet}
      />

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
                  (studySession.mode as any) === "review"
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
          {/* Filters - only show if there are sets */}
          {vocabularySets.length > 0 && (
            <VocabularyFilters
              vocabularySets={vocabularySets}
              searchTerm={searchTerm}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSearchChange={setSearchTerm}
              onSortChange={handleSortChange}
            />
          )}

          {/* Vocabulary List */}
          {filteredAndSortedSets.length > 0 && (
            <VocabularyList
              vocabularySets={filteredAndSortedSets}
              reviewItems={reviewItems}
              statistics={statistics}
              onStartStudySession={startStudySession}
              onExportSet={exportSet}
              onDeleteSet={deleteVocabularySet}
              calculateProgress={calculateProgress}
            />
          )}

          {/* Empty State */}
          {savedPhrases.length === 0 && vocabularySets.length === 0 && (
            <VocabularyEmptyState onImportSet={importSet} />
          )}
        </>
      )}
    </div>
  );
};

export default VocabularyBuilder;