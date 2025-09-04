'use client';

import { memo, useCallback, useMemo } from 'react';
import { Image as ImageIcon, Loader2, BookOpen, Feather, GraduationCap, MessageCircle, Baby } from 'lucide-react';
import { DescriptionProgressIndicator, TextContentSkeleton } from './ProgressIndicator';
import { ImageComponentProps, DescriptionStyle } from '@/types';

interface GeneratedDescriptions {
  english: string | null;
  spanish: string | null;
}

interface DescriptionPanelProps {
  selectedImage: ImageComponentProps;
  selectedStyle: DescriptionStyle;
  generatedDescriptions: GeneratedDescriptions;
  isGenerating: boolean;
  descriptionError: string | null;
  onStyleChange: (style: DescriptionStyle) => void;
  onGenerateDescriptions: () => void;
}

export const DescriptionPanel = memo<DescriptionPanelProps>(function DescriptionPanel({
  selectedImage,
  selectedStyle,
  generatedDescriptions,
  isGenerating,
  descriptionError,
  onStyleChange,
  onGenerateDescriptions
}) {
  const handleStyleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onStyleChange(e.target.value as 'narrativo' | 'poetico' | 'academico' | 'conversacional' | 'infantil');
  }, [onStyleChange]);

  const englishDescription = useMemo(() => {
    return generatedDescriptions.english || 
           selectedImage?.description || 
           selectedImage?.alt_description || 
           'Click "Generate Description" to create AI-powered descriptions.';
  }, [generatedDescriptions.english, selectedImage]);

  const spanishDescription = useMemo(() => {
    return generatedDescriptions.spanish || 
           'Haga clic en "Generate Description" para crear descripciones generadas por IA.';
  }, [generatedDescriptions.spanish]);

  const styleOptions = useMemo(() => [
    { 
      value: 'narrativo', 
      label: 'Narrativo (Storytelling)', 
      icon: BookOpen,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      description: 'Cuenta una historia rica en detalles'
    },
    { 
      value: 'poetico', 
      label: 'Poético (Poetic)', 
      icon: Feather,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      description: 'Lenguaje artístico y metafórico'
    },
    { 
      value: 'academico', 
      label: 'Académico (Academic)', 
      icon: GraduationCap,
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-50 dark:bg-gray-900/20',
      description: 'Formal y educativo, vocabulario avanzado'
    },
    { 
      value: 'conversacional', 
      label: 'Conversacional (Conversational)', 
      icon: MessageCircle,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      description: 'Casual y amigable, expresiones coloquiales'
    },
    { 
      value: 'infantil', 
      label: 'Infantil (Child-friendly)', 
      icon: Baby,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      description: 'Simple y divertido para niños'
    }
  ], []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Image Descriptions</h2>
        {selectedImage && (
          <button
            onClick={onGenerateDescriptions}
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
      
      {/* Style Selector */}
      {selectedImage && (
        <div className="space-y-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Choose your learning style:
          </label>
          
          {/* Style Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {styleOptions.map(option => {
              const Icon = option.icon;
              const isSelected = selectedStyle === option.value;
              
              return (
                <button
                  key={option.value}
                  onClick={() => onStyleChange(option.value as DescriptionStyle)}
                  disabled={isGenerating}
                  className={`
                    relative p-4 rounded-lg border-2 transition-all duration-200 text-left
                    ${isSelected 
                      ? `${option.bgColor} border-current ${option.color} shadow-md` 
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }
                    ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm cursor-pointer'}
                  `}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-5 w-5 ${isSelected ? option.color : 'text-gray-400'}`} />
                    <span className={`font-medium text-sm ${isSelected ? option.color : 'text-gray-700 dark:text-gray-300'}`}>
                      {option.value.charAt(0).toUpperCase() + option.value.slice(1)}
                    </span>
                    {isSelected && (
                      <div className={`w-2 h-2 rounded-full ${option.color.replace('text-', 'bg-').replace('dark:text-', 'dark:bg-')} ml-auto`} />
                    )}
                  </div>
                  <p className={`text-xs ${isSelected ? 'text-gray-600 dark:text-gray-400' : 'text-gray-500 dark:text-gray-500'}`}>
                    {option.description}
                  </p>
                </button>
              );
            })}
          </div>
          
          {/* Selected Style Info */}
          {(() => {
            const currentStyle = styleOptions.find(opt => opt.value === selectedStyle);
            if (!currentStyle) return null;
            
            return (
              <div className={`p-3 rounded-lg ${currentStyle.bgColor} border-l-4 border-current ${currentStyle.color}`}>
                <div className="flex items-center gap-2">
                  <currentStyle.icon className={`h-4 w-4 ${currentStyle.color}`} />
                  <span className={`text-sm font-medium ${currentStyle.color}`}>
                    Selected: {currentStyle.label}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {currentStyle.description}
                </p>
              </div>
            );
          })()} 
        </div>
      )}
      
      {descriptionError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-red-700 dark:text-red-300">{descriptionError}</p>
        </div>
      )}
      
      {/* Progress Indicator */}
      <DescriptionProgressIndicator isGenerating={isGenerating} />
      
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
              {englishDescription}
            </p>
          </div>
          {(() => {
            const currentStyle = styleOptions.find(opt => opt.value === selectedStyle);
            const Icon = currentStyle?.icon || MessageCircle;
            
            return (
              <div className={`p-4 rounded-lg ${currentStyle?.bgColor || 'bg-green-50 dark:bg-green-900/20'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${currentStyle?.color || 'text-green-600 dark:text-green-400'}`} />
                    <h3 className={`font-semibold ${currentStyle?.color || 'text-green-900 dark:text-green-300'}`}>
                      Español - {currentStyle?.label.split(' ')[0] || 'Narrativo'}
                    </h3>
                  </div>
                  {generatedDescriptions.spanish && (
                    <span className={`text-xs px-2 py-1 rounded ${
                      currentStyle?.color.includes('blue') ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200' :
                      currentStyle?.color.includes('purple') ? 'bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200' :
                      currentStyle?.color.includes('gray') ? 'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200' :
                      currentStyle?.color.includes('green') ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200' :
                      'bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200'
                    }`}>
                      Generado por IA
                    </span>
                  )}
                </div>
                <div className={`text-gray-700 dark:text-gray-300 ${
                  selectedStyle === 'poetico' ? 'italic leading-relaxed' :
                  selectedStyle === 'academico' ? 'leading-relaxed font-light' :
                  selectedStyle === 'conversacional' ? 'leading-normal' :
                  selectedStyle === 'infantil' ? 'leading-relaxed text-lg' :
                  'leading-normal'
                }`}>
                  {spanishDescription}
                </div>
              </div>
            );
          })()} 
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400">
          Search and select an image to begin learning.
        </p>
      )}
    </div>
  );
});

DescriptionPanel.displayName = 'DescriptionPanel';