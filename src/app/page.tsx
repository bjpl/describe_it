'use client'

import { useState } from 'react'
import { ImageSearch } from '@/components/ImageSearch'
import { ImageViewer } from '@/components/ImageViewer'
import { DescriptionTabs } from '@/components/DescriptionTabs'
import { QuestionAnswerPanel } from '@/components/QuestionAnswerPanel'
import { PhraseExtractor } from '@/components/PhraseExtractor'
import { useImageSearch } from '@/hooks/useImageSearch'
import { useDescriptions } from '@/hooks/useDescriptions'
import { useQuestionAnswer } from '@/hooks/useQuestionAnswer'
import { usePhraseExtraction } from '@/hooks/usePhraseExtraction'
import { useSession } from '@/hooks/useSession'
import { useExport } from '@/hooks/useExport'
import * as Tabs from '@radix-ui/react-tabs'
import { Menu, Download, Settings, Info, LogOut } from 'lucide-react'

export default function Home() {
  const { searchState, search, loadMore, selectImage, clearSearch } = useImageSearch()
  const { descriptions, generateDescription, regenerateDescription } = useDescriptions()
  const { qaState, generateQuestions, submitAnswer, showAnswer, nextQuestion, previousQuestion } = useQuestionAnswer()
  const { phrases, extractPhrases, addToBank, removeFromBank, filterPhrases, exportPhrases } = usePhraseExtraction()
  const { session, updatePreferences, logout } = useSession()
  const { exportData, downloadExport, exportState } = useExport()

  const [selectedImage, setSelectedImage] = useState<any>(null)
  const [activeDescriptionStyle, setActiveDescriptionStyle] = useState<string>('detailed')
  const [showSpanish, setShowSpanish] = useState(true)
  const [showEnglish, setShowEnglish] = useState(false)

  const handleImageSelect = async (image: any) => {
    setSelectedImage(image)
    selectImage(image)
    
    // Generate initial description
    await generateDescription({
      imageUrl: image.urls.regular,
      style: activeDescriptionStyle,
    })
  }

  const handleExport = async () => {
    const blob = await exportData({
      format: 'json',
      includeImages: true,
      includeDescriptions: true,
      includeQA: true,
      includePhrases: true,
    })
    
    if (blob) {
      downloadExport(blob, `session-export-${Date.now()}.json`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                Describe It
              </h1>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Spanish Learning through Images
              </span>
            </div>
            
            <nav className="flex items-center space-x-4">
              <button
                onClick={handleExport}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Export Session"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="About"
              >
                <Info className="w-5 h-5" />
              </button>
              {session.isAuthenticated && (
                <button
                  onClick={logout}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Image Search & Viewer */}
          <div className="lg:col-span-1 space-y-6">
            <ImageSearch
              onImageSelect={handleImageSelect}
              searchState={searchState}
              onSearch={search}
              onLoadMore={loadMore}
              onClearSearch={clearSearch}
            />
            
            {selectedImage && (
              <ImageViewer
                image={selectedImage}
                onNavigate={(direction) => {
                  // Navigate to next/previous image in search results
                  const currentIndex = searchState.images.findIndex(img => img.id === selectedImage.id)
                  if (direction === 'next' && currentIndex < searchState.images.length - 1) {
                    handleImageSelect(searchState.images[currentIndex + 1])
                  } else if (direction === 'previous' && currentIndex > 0) {
                    handleImageSelect(searchState.images[currentIndex - 1])
                  }
                }}
                onNewSearch={clearSearch}
              />
            )}
          </div>

          {/* Right Column - Tabs for Descriptions, Q&A, and Phrases */}
          <div className="lg:col-span-2">
            <Tabs.Root defaultValue="descriptions" className="w-full">
              <Tabs.List className="flex space-x-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1 mb-6">
                <Tabs.Trigger
                  value="descriptions"
                  className="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors data-[state=active]:bg-white data-[state=active]:text-primary-600 data-[state=active]:shadow dark:data-[state=active]:bg-gray-700"
                >
                  Descriptions
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="qa"
                  className="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors data-[state=active]:bg-white data-[state=active]:text-primary-600 data-[state=active]:shadow dark:data-[state=active]:bg-gray-700"
                >
                  Q&A
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="phrases"
                  className="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors data-[state=active]:bg-white data-[state=active]:text-primary-600 data-[state=active]:shadow dark:data-[state=active]:bg-gray-700"
                >
                  Phrases & Vocabulary
                </Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="descriptions" className="card">
                {selectedImage && (
                  <DescriptionTabs
                    imageUrl={selectedImage.urls.regular}
                    descriptions={descriptions}
                    onGenerateDescription={generateDescription}
                    onRegenerateDescription={regenerateDescription}
                    activeStyle={activeDescriptionStyle}
                    onStyleChange={setActiveDescriptionStyle}
                    showSpanish={showSpanish}
                    showEnglish={showEnglish}
                    onToggleSpanish={() => setShowSpanish(!showSpanish)}
                    onToggleEnglish={() => setShowEnglish(!showEnglish)}
                  />
                )}
              </Tabs.Content>

              <Tabs.Content value="qa" className="card">
                {selectedImage && descriptions[activeDescriptionStyle] && (
                  <QuestionAnswerPanel
                    qaState={qaState}
                    onGenerateQuestions={() => generateQuestions({
                      descriptionId: descriptions[activeDescriptionStyle].id,
                      count: 5,
                      difficulty: 'intermediate',
                    })}
                    onSubmitAnswer={submitAnswer}
                    onShowAnswer={showAnswer}
                    onNextQuestion={nextQuestion}
                    onPreviousQuestion={previousQuestion}
                  />
                )}
              </Tabs.Content>

              <Tabs.Content value="phrases" className="card">
                {selectedImage && descriptions[activeDescriptionStyle] && (
                  <PhraseExtractor
                    phrases={phrases}
                    onExtractPhrases={() => extractPhrases({
                      text: descriptions[activeDescriptionStyle].spanishText,
                      descriptionId: descriptions[activeDescriptionStyle].id,
                    })}
                    onAddToBank={addToBank}
                    onRemoveFromBank={removeFromBank}
                    onFilterPhrases={filterPhrases}
                    onExportPhrases={exportPhrases}
                  />
                )}
              </Tabs.Content>
            </Tabs.Root>
          </div>
        </div>

        {/* Session Stats */}
        {session.isAuthenticated && (
          <div className="mt-8 card">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">Session Progress</p>
                <div className="flex space-x-6">
                  <div>
                    <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                      {searchState.images.length}
                    </span>
                    <span className="ml-2 text-sm text-gray-500">Images</span>
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {Object.keys(descriptions).length}
                    </span>
                    <span className="ml-2 text-sm text-gray-500">Descriptions</span>
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {qaState.questions.length}
                    </span>
                    <span className="ml-2 text-sm text-gray-500">Questions</span>
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {phrases.bank.length}
                    </span>
                    <span className="ml-2 text-sm text-gray-500">Phrases</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Session Duration
                </p>
                <p className="text-lg font-medium">
                  {Math.floor((Date.now() - session.startTime) / 60000)} min
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}