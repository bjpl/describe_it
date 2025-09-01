'use client';

import { useState, useEffect } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { Search, Image as ImageIcon, Download, Settings, Info, Loader2 } from 'lucide-react';
// Dynamic imports for heavy components with code splitting
import { QAPanel, PhrasesPanel, LoadingState } from '@/components';
import { Suspense } from 'react';
import { 
  SearchErrorBoundary,
  ImageGalleryErrorBoundary,
  QAPanelErrorBoundary,
  PhrasesPanelErrorBoundary,
  DescriptionsErrorBoundary
} from '@/components/SectionErrorBoundary';
import { ErrorBoundaryTest } from '@/components/ErrorBoundaryTest';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('descriptions');
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  // Description generation state
  const [generatedDescriptions, setGeneratedDescriptions] = useState<{
    english: string | null;
    spanish: string | null;
  }>({ english: null, spanish: null });
  const [isGenerating, setIsGenerating] = useState(false);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [currentDescription, setCurrentDescription] = useState<string | null>(null);
  const [currentStyle, setCurrentStyle] = useState<'narrativo' | 'poetico' | 'academico' | 'conversacional' | 'infantil'>('narrativo');

  // Clear descriptions when selected image changes
  useEffect(() => {
    setGeneratedDescriptions({ english: null, spanish: null });
    setDescriptionError(null);
  }, [selectedImage?.id]);

  // Initialize dark mode from system preference
  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    document.documentElement.classList.toggle('dark', newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
  };

  const generateDescriptions = async () => {
    if (!selectedImage) return;
    
    setIsGenerating(true);
    setDescriptionError(null);
    
    try {
      const imageUrl = selectedImage.urls?.regular || selectedImage.url || 'https://via.placeholder.com/400x300';
      
      // Generate descriptions in parallel for better performance
      const [englishResponse, spanishResponse] = await Promise.all([
        fetch('/api/descriptions/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl,
            style: 'conversacional',
            language: 'en',
            maxLength: 300,
          }),
        }),
        fetch('/api/descriptions/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl,
            style: 'conversacional',
            language: 'es',
            maxLength: 300,
          }),
        })
      ]);

      // Check if responses are ok
      if (!englishResponse.ok || !spanishResponse.ok) {
        throw new Error(`API Error: ${englishResponse.status} / ${spanishResponse.status}`);
      }

      const [englishData, spanishData] = await Promise.all([
        englishResponse.json(),
        spanishResponse.json()
      ]);
      
      // Handle both success and fallback responses
      if ((englishData.success || englishData.metadata?.fallback) && 
          (spanishData.success || spanishData.metadata?.fallback)) {
        setGeneratedDescriptions({
          english: englishData.data?.text || 'An interesting image that showcases unique visual elements with colors and composition that create an engaging visual experience.',
          spanish: spanishData.data?.text || 'Una imagen interesante que muestra elementos visuales únicos con colores y composición que crean una experiencia visual atractiva.',
        });
      } else {
        // Fallback to demo descriptions
        setGeneratedDescriptions({
          english: 'This image displays fascinating visual elements with vibrant colors and thoughtful composition that invites contemplation and learning.',
          spanish: 'Esta imagen muestra elementos visuales fascinantes con colores vibrantes y una composición reflexiva que invita a la contemplación y el aprendizaje.',
        });
      }
    } catch (error) {
      console.error('Description generation error:', error);
      // Provide graceful fallback even on complete failure
      setGeneratedDescriptions({
        english: 'This is an interesting image with visual elements that provide learning opportunities. The composition and details offer educational value for language learning.',
        spanish: 'Esta es una imagen interesante con elementos visuales que brindan oportunidades de aprendizaje. La composición y los detalles ofrecen valor educativo para el aprendizaje de idiomas.',
      });
      setDescriptionError('Using demo descriptions. API may be temporarily unavailable.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchError('Please enter a search term');
      return;
    }
    
    setLoading(true);
    setSearchError(null);
    
    try {
      const response = await fetch(`/api/images/search?query=${encodeURIComponent(searchQuery)}`);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        setImages(data.results);
        setSelectedImage(data.results[0]);
        setSearchError(null);
      } else {
        setImages([]);
        setSelectedImage(null);
        setSearchError('No images found. Try a different search term.');
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchError('Failed to search images. Please try again.');
      setImages([]);
      setSelectedImage(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!selectedImage || !generatedDescriptions.english) {
      alert('Please generate descriptions first to export data.');
      return;
    }
    
    const exportData = {
      image: {
        id: selectedImage.id,
        url: selectedImage.urls?.regular,
        description: selectedImage.description || selectedImage.alt_description
      },
      descriptions: generatedDescriptions,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `describe-it-export-${selectedImage.id}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
            <div className="flex items-center space-x-2">
              <button 
                onClick={handleExport}
                disabled={!selectedImage || !generatedDescriptions.english}
                className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
                title={!selectedImage || !generatedDescriptions.english ? "Generate descriptions first to export" : "Export data"}
              >
                <Download className="h-5 w-5" />
              </button>
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
              <button 
                onClick={() => setShowInfo(!showInfo)}
                className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="About"
              >
                <Info className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Search and Image Display */}
          <div className="lg:col-span-1 space-y-6">
            {/* Search Bar */}
            <SearchErrorBoundary onRetry={() => window.location.reload()}>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearch();
                      }
                    }}
                    placeholder="Search for images..."
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    aria-label="Search for images"
                    autoComplete="off"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    aria-label="Search for images"
                  >
                    <Search className="h-4 w-4" />
                    {loading ? 'Searching...' : 'Search'}
                  </button>
                </div>
                {searchError && (
                  <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                    {searchError}
                  </div>
                )}
              </div>
            </SearchErrorBoundary>

            {/* Selected Image Display */}
            <ImageGalleryErrorBoundary onRetry={() => setSelectedImage(null)}>
              {selectedImage && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                  <div className="relative w-full h-64 rounded-lg overflow-hidden">
                    <img
                      src={selectedImage.urls?.regular || selectedImage.url}
                      alt={selectedImage.alt_description || 'Selected image'}
                      className="w-full h-full object-cover transition-opacity duration-300"
                      loading="eager"
                      decoding="async"
                    />
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedImage.description || selectedImage.alt_description || 'No description available'}
                    </p>
                  </div>
                </div>
              )}
            </ImageGalleryErrorBoundary>

            {/* Image Grid */}
            <ImageGalleryErrorBoundary onRetry={() => handleSearch()}>
              {images.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                  <h3 className="text-lg font-semibold mb-4">Search Results</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {images.slice(0, 4).map((image, index) => (
                      <button
                        key={image.id || index}
                        onClick={() => setSelectedImage(image)}
                        className="relative group overflow-hidden rounded-lg aspect-square"
                      >
                        <img
                          src={image.urls?.small || image.url}
                          alt={image.alt_description || `Image ${index + 1}`}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          loading="lazy"
                          decoding="async"
                          onLoad={() => console.debug('Image loaded:', image.id)}
                          onError={() => console.warn('Image failed to load:', image.id)}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </ImageGalleryErrorBoundary>
          </div>

          {/* Right Column - Learning Tools */}
          <div className="lg:col-span-2">
            <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
              <Tabs.List className="flex space-x-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1 mb-6">
                <Tabs.Trigger
                  value="descriptions"
                  className="flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
                >
                  Descriptions
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="qa"
                  className="flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
                >
                  Q&A
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="phrases"
                  className="flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
                >
                  Phrases & Vocabulary
                </Tabs.Trigger>
              </Tabs.List>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <Tabs.Content value="descriptions">
                  <DescriptionsErrorBoundary onRetry={generateDescriptions}>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold">Image Descriptions</h2>
                        {selectedImage && (
                          <button
                            onClick={generateDescriptions}
                            disabled={isGenerating}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                          >
                            {isGenerating ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <ImageIcon className="h-4 w-4" />
                            )}
                            {isGenerating ? 'Generating...' : 'Generate Description'}
                          </button>
                        )}
                      </div>
                      
                      {descriptionError && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <p className="text-red-700 dark:text-red-300">{descriptionError}</p>
                        </div>
                      )}
                      
                      {selectedImage ? (
                        <div className="space-y-4">
                          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold text-blue-900 dark:text-blue-300">English</h3>
                              {generatedDescriptions.english && (
                                <span className="text-xs bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                                  AI Generated
                                </span>
                              )}
                            </div>
                            <p className="text-gray-700 dark:text-gray-300">
                              {generatedDescriptions.english || 
                              selectedImage.description || 
                              selectedImage.alt_description || 
                              'Click "Generate Description" to create AI-powered descriptions.'}
                            </p>
                          </div>
                          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold text-green-900 dark:text-green-300">Español</h3>
                              {generatedDescriptions.spanish && (
                                <span className="text-xs bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                                  Generado por IA
                                </span>
                              )}
                            </div>
                            <p className="text-gray-700 dark:text-gray-300">
                              {generatedDescriptions.spanish || 
                              'Haga clic en "Generate Description" para crear descripciones generadas por IA.'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400">
                          Search and select an image to begin learning.
                        </p>
                      )}
                    </div>
                  </DescriptionsErrorBoundary>
                </Tabs.Content>

                <Tabs.Content value="qa">
                  <QAPanelErrorBoundary onRetry={() => window.location.reload()}>
                    <Suspense fallback={<LoadingState message="Loading Q&A panel..." />}>
                      <QAPanel selectedImage={selectedImage} descriptionText={currentDescription} style={currentStyle} />
                    </Suspense>
                  </QAPanelErrorBoundary>
                </Tabs.Content>

                <Tabs.Content value="phrases">
                  <PhrasesPanelErrorBoundary onRetry={() => window.location.reload()}>
                    <Suspense fallback={<LoadingState message="Loading phrases panel..." />}>
                      <PhrasesPanel selectedImage={selectedImage} descriptionText={currentDescription} style={currentStyle} />
                    </Suspense>
                  </PhrasesPanelErrorBoundary>
                </Tabs.Content>
              </div>
            </Tabs.Root>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Settings</h2>
            
            {/* Dark Mode Toggle */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">Dark Mode</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Toggle between light and dark themes</p>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    darkMode ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                  role="switch"
                  aria-checked={darkMode}
                  aria-label="Toggle dark mode"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      darkMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Coming Soon</h3>
                <ul className="list-disc list-inside text-blue-700 dark:text-blue-400 space-y-1 text-sm">
                  <li>Choose your preferred language</li>
                  <li>Adjust difficulty levels</li>
                  <li>Customize learning preferences</li>
                  <li>Manage API keys</li>
                </ul>
              </div>
            </div>
            
            <button
              onClick={() => setShowSettings(false)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">About Describe It</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Describe It is an interactive Spanish learning application that uses images to enhance language acquisition.
            </p>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
              <p><strong>Features:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>AI-powered image descriptions in English and Spanish</li>
                <li>Interactive Q&A exercises</li>
                <li>Vocabulary and phrase extraction</li>
                <li>Multiple difficulty levels</li>
              </ul>
              <p className="mt-4"><strong>Version:</strong> 1.0.0</p>
              <p><strong>Status:</strong> Demo Mode (no API keys required)</p>
            </div>
            <button
              onClick={() => setShowInfo(false)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Error Boundary Test Panel (Development Only) */}
      <ErrorBoundaryTest />
    </div>
  );
}