import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../lib/store/appStore';
import { useSession } from './useSession';
import { queryKeys } from '../providers/ReactQueryProvider';
import {
  ExportOptions,
  ExportData,
  UseExportReturn,
  Image,
  Description,
  QuestionAnswerPair,
  ExtractedPhrase
} from '../types';

// Utility functions for different export formats
const generateJSON = (data: ExportData): string => {
  return JSON.stringify(data, null, 2);
};

const generateCSV = (data: ExportData): string => {
  const headers = ['Type', 'ID', 'Content', 'Created At', 'Additional Info'];
  const rows = [headers.join(',')];
  
  // Add images
  if (data.images.length > 0) {
    data.images.forEach(image => {
      rows.push([
        'Image',
        image.id,
        `"${image.alt_description || image.description || ''}"`,
        image.created_at,
        `"Author: ${image.user.name}, Likes: ${image.likes}"`
      ].join(','));
    });
  }
  
  // Add descriptions
  if (data.descriptions.length > 0) {
    data.descriptions.forEach(desc => {
      rows.push([
        'Description',
        desc.id,
        `"${desc.content.replace(/"/g, '""')}"`,
        desc.createdAt.toISOString(),
        `"Style: ${desc.style}"`
      ].join(','));
    });
  }
  
  // Add Q&A pairs
  if (data.questionAnswers.length > 0) {
    data.questionAnswers.forEach(qa => {
      rows.push([
        'Q&A',
        qa.id,
        `"Q: ${qa.question} A: ${qa.answer}".replace(/"/g, '""')`,
        qa.createdAt.toISOString(),
        `"Confidence: ${qa.confidence || 'N/A'}"`
      ].join(','));
    });
  }
  
  // Add phrases
  if (data.phrases.length > 0) {
    data.phrases.forEach(phrase => {
      rows.push([
        'Phrase',
        phrase.id,
        `"${phrase.phrase}: ${phrase.definition}".replace(/"/g, '""')`,
        phrase.createdAt.toISOString(),
        `"Difficulty: ${phrase.difficulty}, Part of Speech: ${phrase.partOfSpeech}"`
      ].join(','));
    });
  }
  
  return rows.join('\n');
};

const generatePDF = async (data: ExportData): Promise<string> => {
  // This is a simplified PDF generation - in a real app you'd use a library like jsPDF
  const content = [];
  content.push(`# Export Report - ${data.exportedAt.toLocaleDateString()}`);
  content.push('');
  
  if (data.images.length > 0) {
    content.push('## Images');
    data.images.forEach((image, index) => {
      content.push(`${index + 1}. ${image.alt_description || image.description || 'Untitled'}`);
      content.push(`   - Author: ${image.user.name}`);
      content.push(`   - Likes: ${image.likes}`);
      content.push(`   - Created: ${image.created_at}`);
      content.push('');
    });
  }
  
  if (data.descriptions.length > 0) {
    content.push('## Descriptions');
    data.descriptions.forEach((desc, index) => {
      content.push(`${index + 1}. ${desc.style.toUpperCase()} Description`);
      content.push(`   ${desc.content}`);
      content.push(`   - Created: ${desc.createdAt.toLocaleDateString()}`);
      content.push('');
    });
  }
  
  if (data.questionAnswers.length > 0) {
    content.push('## Questions & Answers');
    data.questionAnswers.forEach((qa, index) => {
      content.push(`${index + 1}. Q: ${qa.question}`);
      content.push(`   A: ${qa.answer}`);
      if (qa.confidence) {
        content.push(`   - Confidence: ${(qa.confidence * 100).toFixed(1)}%`);
      }
      content.push(`   - Asked: ${qa.createdAt.toLocaleDateString()}`);
      content.push('');
    });
  }
  
  if (data.phrases.length > 0) {
    content.push('## Vocabulary Phrases');
    const groupedPhrases = data.phrases.reduce((groups, phrase) => {
      if (!groups[phrase.difficulty]) {
        groups[phrase.difficulty] = [];
      }
      groups[phrase.difficulty].push(phrase);
      return groups;
    }, {} as Record<string, ExtractedPhrase[]>);
    
    Object.entries(groupedPhrases).forEach(([difficulty, phrases]) => {
      content.push(`### ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Level`);
      phrases.forEach((phrase, index) => {
        content.push(`${index + 1}. **${phrase.phrase}** (${phrase.partOfSpeech})`);
        content.push(`   ${phrase.definition}`);
        content.push(`   - Context: ${phrase.context}`);
        content.push('');
      });
    });
  }
  
  return content.join('\n');
};

// Mock data fetchers - replace with actual API calls
const fetchAllImages = async (): Promise<Image[]> => {
  // This would typically fetch all images from your backend
  return [];
};

const fetchAllDescriptions = async (): Promise<Description[]> => {
  // This would typically fetch all descriptions from your backend
  return [];
};

const fetchAllQA = async (): Promise<QuestionAnswerPair[]> => {
  // This would typically fetch all Q&A pairs from your backend
  return [];
};

const fetchAllPhrases = async (): Promise<ExtractedPhrase[]> => {
  // This would typically fetch all phrases from your backend
  return [];
};

export const useExport = (): UseExportReturn => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useSession();
  const { currentImage } = useAppStore();
  
  // Queries to fetch all data for export
  const { data: allImages = [] } = useQuery({
    queryKey: ['export', 'images'],
    queryFn: fetchAllImages,
    enabled: false // Only fetch when needed
  });
  
  const { data: allDescriptions = [] } = useQuery({
    queryKey: ['export', 'descriptions'],
    queryFn: fetchAllDescriptions,
    enabled: false
  });
  
  const { data: allQA = [] } = useQuery({
    queryKey: ['export', 'qa'],
    queryFn: fetchAllQA,
    enabled: false
  });
  
  const { data: allPhrases = [] } = useQuery({
    queryKey: ['export', 'phrases'],
    queryFn: fetchAllPhrases,
    enabled: false
  });
  
  const exportData = useCallback(async (options: ExportOptions): Promise<Blob> => {
    setIsExporting(true);
    setError(null);
    
    try {
      // Collect data based on options
      let images: Image[] = [];
      let descriptions: Description[] = [];
      let questionAnswers: QuestionAnswerPair[] = [];
      let phrases: ExtractedPhrase[] = [];
      
      // Filter data based on date range if specified
      const filterByDate = (item: { createdAt?: Date; created_at?: string }) => {
        if (!options.dateRange) return true;
        
        const itemDate = item.createdAt 
          ? new Date(item.createdAt) 
          : item.created_at 
            ? new Date(item.created_at)
            : new Date();
            
        return itemDate >= options.dateRange.start && itemDate <= options.dateRange.end;
      };
      
      // Collect data based on options
      if (options.includeImages) {
        images = allImages.filter(filterByDate);
      }
      
      if (options.includeDescriptions) {
        descriptions = allDescriptions.filter(filterByDate);
      }
      
      if (options.includeQA) {
        questionAnswers = allQA.filter(filterByDate);
      }
      
      if (options.includePhrases) {
        phrases = allPhrases.filter(filterByDate);
      }
      
      // Create export data object
      const exportDataObj: ExportData = {
        images,
        descriptions,
        questionAnswers,
        phrases,
        exportedAt: new Date(),
        sessionInfo: session ? {
          id: session.id,
          userId: session.userId,
          startTime: session.startTime,
          preferences: session.preferences
        } : {}
      };
      
      // Generate content based on format
      let content: string;
      let mimeType: string;
      
      switch (options.format) {
        case 'json':
          content = generateJSON(exportDataObj);
          mimeType = 'application/json';
          break;
        case 'csv':
          content = generateCSV(exportDataObj);
          mimeType = 'text/csv';
          break;
        case 'pdf':
          content = await generatePDF(exportDataObj);
          mimeType = 'text/plain'; // Simplified - would be 'application/pdf' with real PDF generation
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
      
      // Create and return blob
      const blob = new Blob([content], { type: mimeType });
      return blob;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export data';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsExporting(false);
    }
  }, [allImages, allDescriptions, allQA, allPhrases, session]);
  
  const downloadExport = useCallback((blob: Blob, filename: string) => {
    try {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download file';
      setError(errorMessage);
    }
  }, []);
  
  return {
    isExporting,
    error,
    exportData,
    downloadExport
  };
};

// Hook for quick exports with predefined options
export const useQuickExport = () => {
  const { exportData, downloadExport } = useExport();
  
  const exportAll = useCallback(async (format: ExportOptions['format'] = 'json') => {
    const options: ExportOptions = {
      format,
      includeImages: true,
      includeDescriptions: true,
      includeQA: true,
      includePhrases: true
    };
    
    const blob = await exportData(options);
    const filename = `describe-it-export-${new Date().toISOString().split('T')[0]}.${format}`;
    downloadExport(blob, filename);
  }, [exportData, downloadExport]);
  
  const exportCurrentSession = useCallback(async (format: ExportOptions['format'] = 'json') => {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    
    const options: ExportOptions = {
      format,
      includeImages: true,
      includeDescriptions: true,
      includeQA: true,
      includePhrases: true,
      dateRange: {
        start: startOfDay,
        end: today
      }
    };
    
    const blob = await exportData(options);
    const filename = `session-export-${new Date().toISOString().split('T')[0]}.${format}`;
    downloadExport(blob, filename);
  }, [exportData, downloadExport]);
  
  const exportDescriptionsOnly = useCallback(async (format: ExportOptions['format'] = 'json') => {
    const options: ExportOptions = {
      format,
      includeImages: false,
      includeDescriptions: true,
      includeQA: false,
      includePhrases: false
    };
    
    const blob = await exportData(options);
    const filename = `descriptions-export-${new Date().toISOString().split('T')[0]}.${format}`;
    downloadExport(blob, filename);
  }, [exportData, downloadExport]);
  
  const exportVocabulary = useCallback(async (format: ExportOptions['format'] = 'json') => {
    const options: ExportOptions = {
      format,
      includeImages: false,
      includeDescriptions: false,
      includeQA: false,
      includePhrases: true
    };
    
    const blob = await exportData(options);
    const filename = `vocabulary-export-${new Date().toISOString().split('T')[0]}.${format}`;
    downloadExport(blob, filename);
  }, [exportData, downloadExport]);
  
  return {
    exportAll,
    exportCurrentSession,
    exportDescriptionsOnly,
    exportVocabulary
  };
};

// Hook for export analytics and statistics
export const useExportStats = () => {
  const getTotalExportableItems = useCallback(() => {
    // This would typically come from your backend
    return {
      images: 0,
      descriptions: 0,
      questionAnswers: 0,
      phrases: 0
    };
  }, []);
  
  const getExportHistory = useCallback(() => {
    // This would typically come from your backend or local storage
    return [];
  }, []);
  
  const estimateExportSize = useCallback((options: ExportOptions) => {
    // Rough estimation - in a real app you'd have more accurate calculations
    const stats = getTotalExportableItems();
    let estimatedSize = 0;
    
    if (options.includeImages) {
      estimatedSize += stats.images * 200; // ~200 bytes per image metadata
    }
    if (options.includeDescriptions) {
      estimatedSize += stats.descriptions * 500; // ~500 bytes per description
    }
    if (options.includeQA) {
      estimatedSize += stats.questionAnswers * 300; // ~300 bytes per Q&A
    }
    if (options.includePhrases) {
      estimatedSize += stats.phrases * 150; // ~150 bytes per phrase
    }
    
    // Format multiplier
    switch (options.format) {
      case 'json':
        estimatedSize *= 1.2; // JSON overhead
        break;
      case 'csv':
        estimatedSize *= 0.8; // CSV is more compact
        break;
      case 'pdf':
        estimatedSize *= 2; // PDF has significant overhead
        break;
    }
    
    return Math.round(estimatedSize);
  }, [getTotalExportableItems]);
  
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);
  
  return {
    getTotalExportableItems,
    getExportHistory,
    estimateExportSize,
    formatFileSize
  };
};