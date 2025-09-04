'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Settings, Info, Download, Users, Brain, Zap } from 'lucide-react'
import { UnsplashImage, DescriptionStyle, QAResponse, VocabularyItem, ExportableData } from '@/types'
import { ImageSearch } from '@/components/ImageSearch'
import { InlineImageViewer } from '@/components/ImageViewer'
import { LoadingSpinner } from '@/components/Loading/LoadingSpinner'
import { ErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary'
import { DescriptionNotebook } from '@/components/DescriptionNotebook'
import { QASystemDemo } from '@/components/QASystemDemo'
import { DatabaseVocabularyManager } from '@/components/Vocabulary/DatabaseVocabularyManager'
import { useSessionLogger } from '@/hooks/useSessionLogger'
import { withRetry, apiCallWithRetry, RETRY_CONFIGS, getErrorMessage } from '@/lib/utils/error-retry'
import { unifiedExporter } from '@/lib/export/unifiedExporter'

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<UnsplashImage | null>(null)
  const [descriptions, setDescriptions] = useState({ english: '', spanish: '' })
  const [generating, setGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState<'descriptions' | 'qa' | 'vocabulary'>('descriptions')
  const [error, setError] = useState<string | null>(null)
  const [exportData, setExportData] = useState<ExportableData>({})
  const [currentDescriptionStyle, setCurrentDescriptionStyle] = useState<DescriptionStyle>('conversacional')
  const [currentDescriptionText, setCurrentDescriptionText] = useState<string | null>(null)
  
  // Hive Mind Integration - Session logging
  const {
    logInteraction,
    logImageSelection,
    logDescriptionGeneration,
    logError,
    generateSummary,
    exportSession
  } = useSessionLogger({ autoStart: true, persistToStorage: true })
  
  // Refs for data tracking
  const descriptionsRef = useRef<ExportableData['descriptions']>([])
  const qaResponsesRef = useRef<ExportableData['qaResponses']>([])
  const vocabularyRef = useRef<ExportableData['vocabulary']>([])

  const handleImageSelect = useCallback((image: UnsplashImage) => {
    const selectionTime = Date.now()
    setSelectedImage(image)
    setError(null)
    setCurrentDescriptionText(null)
    
    // Clear previous descriptions when selecting new image
    setDescriptions({ english: '', spanish: '' })
    
    // Hive Mind Logging
    logImageSelection(image.id, image.urls?.regular || image.urls.small, selectionTime)
    logInteraction('image_selected', {
      imageId: image.id,
      imageUrl: image.urls?.regular || image.urls.small,
      photographer: image.user?.name,
      altDescription: image.alt_description
    })
  }, [logImageSelection, logInteraction])

  const generateDescriptions = useCallback(async () => {
    if (!selectedImage) return
    
    setGenerating(true)
    setError(null)
    const startTime = Date.now()
    
    try {
      const imageUrl = selectedImage.urls?.regular || selectedImage.urls.small
      
      // Use error retry mechanism for API calls
      const [englishResult, spanishResult] = await Promise.all([
        withRetry(
          () => fetch('/api/descriptions/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageUrl,
              style: currentDescriptionStyle,
              language: 'en',
              maxLength: 200
            })
          }).then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
            return res.json()
          }),
          RETRY_CONFIGS.descriptionGeneration
        ),
        withRetry(
          () => fetch('/api/descriptions/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageUrl,
              style: currentDescriptionStyle,
              language: 'es',
              maxLength: 200
            })
          }).then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
            return res.json()
          }),
          RETRY_CONFIGS.descriptionGeneration
        )
      ])
      
      const englishText = englishResult.success && englishResult.data?.data?.text 
        ? englishResult.data.data.text
        : 'This image contains interesting visual elements perfect for language learning.'
      
      const spanishText = spanishResult.success && spanishResult.data?.data?.text
        ? spanishResult.data.data.text 
        : 'Esta imagen contiene elementos visuales interesantes perfectos para el aprendizaje de idiomas.'
      
      setDescriptions({ english: englishText, spanish: spanishText })
      setCurrentDescriptionText(spanishText) // Use Spanish for Q&A
      
      // Log successful generation
      const generationTime = Date.now() - startTime
      logDescriptionGeneration(
        currentDescriptionStyle,
        'bilingual',
        englishText.split(' ').length + spanishText.split(' ').length,
        generationTime,
        `EN: ${englishText}\nES: ${spanishText}`
      )
      
      // Store for export
      descriptionsRef.current.push({
        imageId: selectedImage.id,
        imageUrl: imageUrl,
        style: currentDescriptionStyle,
        english: englishText,
        spanish: spanishText,
        timestamp: new Date().toISOString()
      })
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      const userMessage = getErrorMessage(err)
      setError(userMessage)
      
      // Log error
      logError(err.message, err.stack, 'description_generation')
      
      // Use fallback descriptions
      const fallbackDescriptions = {
        english: 'This is a beautiful image with educational potential for Spanish learning.',
        spanish: 'Esta es una imagen hermosa con potencial educativo para el aprendizaje del español.'
      }
      setDescriptions(fallbackDescriptions)
      setCurrentDescriptionText(fallbackDescriptions.spanish)
      
    } finally {
      setGenerating(false)
    }
  }, [selectedImage, currentDescriptionStyle, logDescriptionGeneration, logError])

  const handleGenerateStyleDescription = useCallback(async (style: DescriptionStyle) => {
    if (!selectedImage) return
    
    setCurrentDescriptionStyle(style)
    logInteraction('style_changed', { style, imageId: selectedImage.id })
  }, [selectedImage, logInteraction])
  
  // Handle description updates from DescriptionNotebook
  const handleDescriptionUpdate = useCallback((style: DescriptionStyle, english: string, spanish: string) => {
    if (style === currentDescriptionStyle) {
      setCurrentDescriptionText(spanish)
    }
    
    // Store for export
    const existingIndex = descriptionsRef.current.findIndex(
      desc => desc.imageId === selectedImage?.id && desc.style === style
    )
    
    const descriptionData = {
      imageId: selectedImage?.id || '',
      imageUrl: selectedImage?.urls?.regular || selectedImage?.urls.small || '',
      style,
      english,
      spanish,
      timestamp: new Date().toISOString()
    }
    
    if (existingIndex >= 0) {
      descriptionsRef.current[existingIndex] = descriptionData
    } else {
      descriptionsRef.current.push(descriptionData)
    }
  }, [currentDescriptionStyle, selectedImage])
  
  // Handle Q&A responses
  const handleQAResponse = useCallback((response: QAResponse) => {
    qaResponsesRef.current?.push({
      question: response.question,
      user_answer: response.user_answer,
      correct_answer: response.correct_answer,
      timestamp: response.timestamp
    })
  }, [])
  
  // Handle vocabulary selection
  const handleVocabularyUpdate = useCallback((vocabulary: VocabularyItem[]) => {
    vocabularyRef.current = vocabulary.map(item => ({
      id: item.id,
      spanish_text: item.spanish_text,
      english_translation: item.english_translation,
      category: item.category,
      difficulty_level: item.difficulty_level,
      context_sentence_spanish: item.context_sentence_spanish,
      part_of_speech: item.part_of_speech,
      created_at: item.created_at
    }))
  }, [])
  
  // Unified export function
  const handleExportAll = useCallback(async () => {
    try {
      logInteraction('export_initiated', { 
        descriptionsCount: descriptionsRef.current.length,
        qaCount: qaResponsesRef.current.length,
        vocabularyCount: vocabularyRef.current.length
      })
      
      const sessionData = generateSummary()
      const sessionInteractions = sessionData ? Object.entries(sessionData).map(([key, value]) => ({
        interaction_type: key,
        component: 'session',
        data: JSON.stringify(value),
        timestamp: new Date().toISOString()
      })) : []
      
      await unifiedExporter.exportAll({
        descriptions: descriptionsRef.current,
        qaResponses: qaResponsesRef.current,
        vocabulary: vocabularyRef.current,
        sessionData: sessionInteractions
      }, {
        format: 'csv',
        includeDescriptions: true,
        includeQA: true,
        includeVocabulary: true,
        includeSessionData: true
      })
      
      logInteraction('export_completed', { format: 'csv' })
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      logError(err.message, err.stack, 'export_error')
      setError('Failed to export data. Please try again.')
    }
  }, [logInteraction, logError, generateSummary])

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  Describe It
                </h1>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Spanish Learning through Images
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={handleExportAll}
                  className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Export All Data (CSV)"
                >
                  <Download className="h-5 w-5" />
                </button>
                <button 
                  className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Settings"
                >
                  <Settings className="h-5 w-5" />
                </button>
                <button 
                  className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Help & Info"
                >
                  <Info className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Image Search */}
            <div className="lg:col-span-1 space-y-6">
              <ImageSearch onImageSelect={handleImageSelect} />
            </div>

            {/* Right Column - Learning Content */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                {selectedImage ? (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold">Spanish Learning Content</h2>
                    
                    {/* Image Viewer Component */}
                    <InlineImageViewer 
                      image={selectedImage}
                      onGenerateDescriptions={generateDescriptions}
                      isGenerating={generating}
                    />
                    
                    {/* Multi-Style Description Notebook */}
                    <DescriptionNotebook
                      image={selectedImage}
                      onGenerateDescription={handleGenerateStyleDescription}
                    />
                    
                    {/* Hive Mind Integration Tabs */}
                    <div className="mt-6">
                      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg mb-6">
                        <button
                          onClick={() => setActiveTab('descriptions')}
                          className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            activeTab === 'descriptions'
                              ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          <Brain className="w-4 h-4 mr-2" />
                          Alpha-1: Descriptions
                        </button>
                        <button
                          onClick={() => setActiveTab('qa')}
                          className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            activeTab === 'qa'
                              ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-sm'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          <Zap className="w-4 h-4 mr-2" />
                          Beta-2: Q&A System
                        </button>
                        <button
                          onClick={() => setActiveTab('vocabulary')}
                          className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            activeTab === 'vocabulary'
                              ? 'bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 shadow-sm'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          <Users className="w-4 h-4 mr-2" />
                          Gamma-3: Vocabulary
                        </button>
                      </div>
                      
                      {/* Error Display */}
                      {error && (
                        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                          <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
                        </div>
                      )}
                      
                      {/* Tab Content */}
                      {activeTab === 'descriptions' && (
                        <DescriptionNotebook
                          image={selectedImage}
                          onGenerateDescription={handleGenerateStyleDescription}
                          onDescriptionUpdate={handleDescriptionUpdate}
                        />
                      )}
                      
                      {activeTab === 'qa' && currentDescriptionText && (
                        <QASystemDemo
                          imageUrl={selectedImage.urls.regular}
                          description={currentDescriptionText}
                          language="es"
                        />
                      )}
                      
                      {activeTab === 'vocabulary' && (
                        <DatabaseVocabularyManager
                          className=""
                          showStats={true}
                          allowEdit={true}
                          compact={false}
                          onVocabularyUpdate={handleVocabularyUpdate}
                        />
                      )}
                    </div>
                    
                    {/* Loading state for description generation */}
                    {generating && (
                      <div className="flex items-center justify-center py-8">
                        <LoadingSpinner size="lg" />
                        <span className="ml-3 text-gray-600 dark:text-gray-400">
                          Generating descriptions...
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="text-6xl mb-4">📸</div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Welcome to Describe It!
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                      Search for images to start your Spanish learning journey. 
                      Generate AI-powered descriptions in both English and Spanish.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}