'use client'

import { useState, useCallback, useEffect } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { Download, Settings, Info, Search, Image as ImageIcon, X } from 'lucide-react'
import { ImageSearch } from '@/components/ImageSearch/ImageSearch'
import { LoadingSpinner } from '@/components/Shared/LoadingStates/LoadingSpinner'
import { NoSSR } from '@/components/NoSSR'
import { UnsplashImage } from '@/types'
import { useImageSearch, useExport, useSession } from '@/hooks'

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<UnsplashImage | null>(null)
  const [activeTab, setActiveTab] = useState('descriptions')
  const [searchMode, setSearchMode] = useState<'simple' | 'advanced'>('simple')
  const [mounted, setMounted] = useState(false)
  
  // Hooks for functionality
  const { 
    images, 
    loading, 
    error, 
    searchImages: performSearch, 
    clearResults: clearSearch 
  } = useImageSearch()
  const { isExporting, exportData } = useExport()
  const { session, updatePreferences } = useSession()

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
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
            </div>
          </div>
        </header>
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  // Event Handlers
  const handleImageSelect = useCallback((image: UnsplashImage) => {
    setSelectedImage(image)
    // Auto-switch to descriptions tab when image is selected
    if (activeTab === 'search') {
      setActiveTab('descriptions')
    }
  }, [activeTab])

  const handleSimpleSearch = useCallback((query: string) => {
    if (query.trim()) {
      performSearch(query)
    }
  }, [performSearch])

  const handleExportSession = useCallback(async () => {
    try {
      const blob = await exportData({
        format: 'json',
        includeImages: true,
        includeDescriptions: true,
        includeQA: true,
        includePhrases: true
      })
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `describe-it-session-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      // Could show a toast notification here
    }
  }, [exportData])

  const handleOpenSettings = useCallback(() => {
    // For now, just log - could open a settings modal
    console.log('Settings clicked')
    // TODO: Implement settings modal
  }, [])

  const handleShowAbout = useCallback(() => {
    // For now, just log - could open an about modal
    console.log('About clicked')
    // TODO: Implement about modal
  }, [])

  return (
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
            
            <nav className="flex items-center space-x-4">
              <button
                onClick={handleExportSession}
                disabled={isExporting}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                title="Export Session"
              >
                {isExporting ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={handleOpenSettings}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={handleShowAbout}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="About"
              >
                <Info className="w-5 h-5" />
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="main-content">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Image Search */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Search Images
                </h2>
                <button
                  onClick={() => setSearchMode(searchMode === 'simple' ? 'advanced' : 'simple')}
                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors"
                >
                  {searchMode === 'simple' ? 'Advanced' : 'Simple'}
                </button>
              </div>
              
              <NoSSR fallback={<div className="animate-pulse h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>}>
                {searchMode === 'simple' ? (
                  <div className="space-y-4">
                    <SimpleSearchForm onSearch={handleSimpleSearch} isLoading={loading.isLoading} />
                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                        {error}
                      </div>
                    )}
                    {images.length > 0 && (
                      <SimpleImageGrid 
                        images={images.slice(0, 6)} 
                        onImageSelect={handleImageSelect}
                        isLoading={loading.isLoading}
                      />
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <ImageSearch 
                      onImageSelect={handleImageSelect}
                      className="" 
                    />
                  </div>
                )}
              </NoSSR>
            </div>
            
            {/* Selected Image Display */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                Selected Image
              </h3>
              {selectedImage ? (
                <SelectedImageDisplay 
                  image={selectedImage} 
                  onClear={() => setSelectedImage(null)}
                />
              ) : (
                <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                    <p className="text-sm">Search and select an image to get started</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Content Tabs */}
          <div className="lg:col-span-2">
            <NoSSR fallback={<div className="animate-pulse h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>}>
              <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full">
              <Tabs.List className="flex space-x-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1 mb-6">
                <Tabs.Trigger
                  value="descriptions"
                  className="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow dark:data-[state=active]:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  Descriptions
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="qa"
                  className="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow dark:data-[state=active]:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  Q&A
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="phrases"
                  className="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow dark:data-[state=active]:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  Phrases & Vocabulary
                </Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="descriptions" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                {selectedImage ? (
                  <DescriptionsPanel image={selectedImage} />
                ) : (
                  <EmptyStatePanel 
                    title="Generate Descriptions"
                    description="Select an image to generate Spanish descriptions in different styles"
                    detail="Available styles: Detailed, Simple, Conversational, Academic"
                  />
                )}
              </Tabs.Content>

              <Tabs.Content value="qa" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                {selectedImage ? (
                  <QAPanel image={selectedImage} />
                ) : (
                  <EmptyStatePanel 
                    title="Questions & Answers"
                    description="Test your understanding with AI-generated questions about the image"
                    detail="Practice comprehension, vocabulary, and cultural context"
                  />
                )}
              </Tabs.Content>

              <Tabs.Content value="phrases" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                {selectedImage ? (
                  <PhrasesPanel image={selectedImage} />
                ) : (
                  <EmptyStatePanel 
                    title="Vocabulary Bank"
                    description="Extract and save useful Spanish phrases and vocabulary"
                    detail="Build your personal collection of words and expressions"
                  />
                )}
              </Tabs.Content>
              </Tabs.Root>
            </NoSSR>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Welcome to Describe It
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Learn Spanish through visual storytelling! Search for images, generate detailed descriptions, 
              test your comprehension with questions, and build your vocabulary bank. This interactive approach 
              helps you learn Spanish naturally through context and visual association.
            </p>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">Visual Learning</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Connect words with images for better retention
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <h3 className="font-medium text-green-900 dark:text-green-200 mb-2">Interactive Practice</h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Test comprehension with AI-generated questions
                </p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                <h3 className="font-medium text-purple-900 dark:text-purple-200 mb-2">Vocabulary Building</h3>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Save and organize useful phrases and words
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// Component for simple search form
interface SimpleSearchFormProps {
  onSearch: (query: string) => void
  isLoading: boolean
}

function SimpleSearchForm({ onSearch, isLoading }: SimpleSearchFormProps) {
  const [query, setQuery] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch(query.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search for images (e.g., 'nature', 'food', 'people')"
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          disabled={isLoading}
        />
        <Search className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
      </div>
      
      <button
        type="submit"
        disabled={isLoading || !query.trim()}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <LoadingSpinner size="sm" />
        ) : (
          <ImageIcon className="h-4 w-4" />
        )}
        {isLoading ? 'Searching...' : 'Search Images'}
      </button>
    </form>
  )
}

// Component for selected image display
interface SelectedImageDisplayProps {
  image: UnsplashImage
  onClear: () => void
}

function SelectedImageDisplay({ image, onClear }: SelectedImageDisplayProps) {
  return (
    <div className="space-y-3">
      <div className="aspect-square relative overflow-hidden rounded-lg bg-gray-100">
        <img
          src={image.urls.regular}
          alt={image.alt_description || 'Selected image'}
          className="w-full h-full object-cover"
        />
        <button
          onClick={onClear}
          className="absolute top-2 right-2 p-1 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full transition-colors"
          title="Clear selection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400">
        <p className="font-medium">{image.user.name}</p>
        {image.description && (
          <p className="truncate" title={image.description}>{image.description}</p>
        )}
      </div>
    </div>
  )
}

// Empty state component
interface EmptyStatePanelProps {
  title: string
  description: string
  detail: string
}

function EmptyStatePanel({ title, description, detail }: EmptyStatePanelProps) {
  return (
    <div className="text-center py-12">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        {description}
      </p>
      <div className="text-sm text-gray-500">
        {detail}
      </div>
    </div>
  )
}

// Placeholder components for the panels
function DescriptionsPanel({ image }: { image: UnsplashImage }) {
  const [isLoading, setIsLoading] = useState(false)
  const [descriptions, setDescriptions] = useState<Array<{ style: string; content: string; wordCount?: number; }>>([])
  const [error, setError] = useState<string | null>(null)

  const styleMap: Record<string, { key: string; label: string; description: string }> = {
    'Narrative': { key: 'narrativo', label: 'Narrative', description: 'Storytelling description' },
    'Simple': { key: 'conversacional', label: 'Simple', description: 'Easy conversational Spanish' },
    'Poetic': { key: 'poetico', label: 'Poetic', description: 'Artistic and creative language' },
    'Academic': { key: 'academico', label: 'Academic', description: 'Formal and structured content' }
  }

  const handleGenerateDescription = async (styleLabel: string) => {
    const styleConfig = styleMap[styleLabel]
    if (!styleConfig) return

    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: image.urls.regular,
          style: styleConfig.key,
          language: 'es',
          maxLength: 300
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        const newDescription = {
          style: styleConfig.label,
          content: data.data.text,
          wordCount: data.data.wordCount
        }
        setDescriptions(prev => [...prev, newDescription])
      } else {
        setError('Failed to generate description. Please try again.')
      }
    } catch (error) {
      console.error('Description generation failed:', error)
      setError('Network error. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Spanish Descriptions</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Generate descriptions in different Spanish styles
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {Object.keys(styleMap).map(styleLabel => (
            <button
              key={styleLabel}
              onClick={() => handleGenerateDescription(styleLabel)}
              disabled={isLoading}
              className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-2"
              title={styleMap[styleLabel].description}
            >
              {isLoading ? <LoadingSpinner size="sm" /> : null}
              {styleLabel}
            </button>
          ))}
        </div>
      </div>
      
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      
      {descriptions.length > 0 ? (
        <div className="space-y-4">
          {descriptions.map((desc, index) => (
            <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-l-4 border-blue-500">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-blue-600 dark:text-blue-400">
                  {desc.style} Description
                </h4>
                {desc.wordCount && (
                  <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
                    {desc.wordCount} words
                  </span>
                )}
              </div>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {desc.content}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <ImageIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400">
            Click on a style button above to generate Spanish descriptions for this image
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            {image.description || image.alt_description || 'Selected image'}
          </p>
        </div>
      )}
    </div>
  )
}

function QAPanel({ image }: { image: UnsplashImage }) {
  const [isLoading, setIsLoading] = useState(false)
  const [qaItems, setQaItems] = useState<Array<{ question: string; answer: string }>>([])
  const [customQuestion, setCustomQuestion] = useState('')

  const handleGenerateQA = async () => {
    setIsLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      const newQA = {
        question: '¿Qué elementos principales puedes ver en esta imagen?',
        answer: 'En esta imagen se pueden ver varios elementos como...'
      }
      setQaItems(prev => [...prev, newQA])
    } catch (error) {
      console.error('Q&A generation failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAskCustomQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customQuestion.trim()) return
    
    setIsLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      const newQA = {
        question: customQuestion,
        answer: `Respuesta a tu pregunta: "${customQuestion}". Esta sería la respuesta generada...`
      }
      setQaItems(prev => [...prev, newQA])
      setCustomQuestion('')
    } catch (error) {
      console.error('Custom question failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Questions & Answers</h3>
        <button
          onClick={handleGenerateQA}
          disabled={isLoading}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded transition-colors disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? <LoadingSpinner size="sm" /> : null}
          Generate Q&A
        </button>
      </div>

      {/* Custom Question Form */}
      <form onSubmit={handleAskCustomQuestion} className="flex gap-2">
        <input
          type="text"
          value={customQuestion}
          onChange={(e) => setCustomQuestion(e.target.value)}
          placeholder="Ask a question about this image in Spanish..."
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !customQuestion.trim()}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded transition-colors disabled:cursor-not-allowed"
        >
          Ask
        </button>
      </form>
      
      {qaItems.length > 0 ? (
        <div className="space-y-4">
          {qaItems.map((item, index) => (
            <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="font-medium text-green-600 mb-2">Q: {item.question}</h4>
              <p className="text-gray-700 dark:text-gray-300 pl-4">A: {item.answer}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600 dark:text-gray-400">
          Generate questions or ask your own to practice Spanish comprehension for: {image.description || 'this image'}
        </p>
      )}
    </div>
  )
}

function PhrasesPanel({ image }: { image: UnsplashImage }) {
  const [isLoading, setIsLoading] = useState(false)
  const [phrases, setPhrases] = useState<Array<{ phrase: string; translation: string; difficulty: string }>>([])

  const handleExtractPhrases = async () => {
    setIsLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      const newPhrases = [
        { phrase: 'paisaje hermoso', translation: 'beautiful landscape', difficulty: 'beginner' },
        { phrase: 'iluminación natural', translation: 'natural lighting', difficulty: 'intermediate' },
        { phrase: 'composición artística', translation: 'artistic composition', difficulty: 'advanced' }
      ]
      setPhrases(prev => [...prev, ...newPhrases])
    } catch (error) {
      console.error('Phrase extraction failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Vocabulary & Phrases</h3>
        <button
          onClick={handleExtractPhrases}
          disabled={isLoading}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded transition-colors disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? <LoadingSpinner size="sm" /> : null}
          Extract Phrases
        </button>
      </div>
      
      {phrases.length > 0 ? (
        <div className="space-y-3">
          {phrases.map((phrase, index) => (
            <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-between">
              <div>
                <p className="font-medium text-purple-600">{phrase.phrase}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{phrase.translation}</p>
              </div>
              <span className={`px-2 py-1 text-xs rounded ${
                phrase.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                phrase.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {phrase.difficulty}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600 dark:text-gray-400">
          Extract Spanish vocabulary and phrases from: {image.description || 'this image'}
        </p>
      )}
    </div>
  )
}

// Simple image grid component for basic search results
interface SimpleImageGridProps {
  images: UnsplashImage[]
  onImageSelect: (image: UnsplashImage) => void
  isLoading: boolean
}

function SimpleImageGrid({ images, onImageSelect, isLoading }: SimpleImageGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {images.map((image) => (
        <button
          key={image.id}
          onClick={() => onImageSelect(image)}
          className="aspect-square relative overflow-hidden rounded-lg bg-gray-100 hover:ring-2 hover:ring-blue-500 transition-all group"
        >
          <img
            src={image.urls.small}
            alt={image.alt_description || 'Search result'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200" />
        </button>
      ))}
    </div>
  )
}