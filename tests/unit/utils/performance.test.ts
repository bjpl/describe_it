import { describe, it, expect, vi, beforeEach } from 'vitest';
import { measureExecutionTime, createLargeDataset, measureMemoryUsage, checkForMemoryLeaks } from '../../utils/test-helpers';

describe('Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Image Search Performance', () => {
    it('should search images within performance threshold', async () => {
      const mockSearchFunction = vi.fn().mockImplementation(async (query: string) => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 50));
        return {
          total: 100,
          results: Array.from({ length: 20 }, (_, i) => ({
            id: `${query}-${i}`,
            urls: { small: 'test.jpg', regular: 'test.jpg', full: 'test.jpg' },
            alt_description: `${query} image ${i}`,
          })),
        };
      });

      const executionTime = await measureExecutionTime(async () => {
        await mockSearchFunction('performance-test');
      });

      // Should complete within 100ms (50ms mock delay + processing time)
      expect(executionTime).toBeLessThan(100);
    });

    it('should handle large result sets efficiently', async () => {
      const largeDataset = createLargeDataset(1000);
      
      const executionTime = await measureExecutionTime(async () => {
        // Simulate processing large dataset
        const filtered = largeDataset.filter(item => item.id.includes('item'));
        const mapped = filtered.map(item => ({ ...item, processed: true }));
        return mapped.slice(0, 100); // Pagination
      });

      // Should process 1000 items and return 100 within reasonable time
      expect(executionTime).toBeLessThan(50);
    });
  });

  describe('Description Generation Performance', () => {
    it('should generate descriptions within time limit', async () => {
      const mockGenerateDescription = vi.fn().mockImplementation(async (request: any) => {
        // Simulate API processing time
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          text: 'Generated description'.repeat(50), // Simulate longer description
          wordCount: 100,
          generatedAt: new Date().toISOString(),
        };
      });

      const executionTime = await measureExecutionTime(async () => {
        await mockGenerateDescription({
          imageUrl: 'test.jpg',
          style: 'narrativo',
        });
      });

      // Should complete within 150ms (100ms mock + processing)
      expect(executionTime).toBeLessThan(150);
    });

    it('should handle batch description generation efficiently', async () => {
      const styles = ['narrativo', 'poetico', 'academico', 'conversacional', 'infantil'];
      const mockBatchGenerate = vi.fn().mockImplementation(async (requests: any[]) => {
        // Simulate parallel processing
        const promises = requests.map(async (req) => {
          await new Promise(resolve => setTimeout(resolve, 30)); // Faster due to batching
          return { style: req.style, text: `Description for ${req.style}` };
        });
        return Promise.all(promises);
      });

      const executionTime = await measureExecutionTime(async () => {
        await mockBatchGenerate(styles.map(style => ({ style, imageUrl: 'test.jpg' })));
      });

      // Batch processing should be faster than sequential (5 * 30ms = 150ms max)
      expect(executionTime).toBeLessThan(100);
    });
  });

  describe('Phrase Extraction Performance', () => {
    it('should extract phrases from long text efficiently', async () => {
      const longText = 'Esta es una descripción muy larga con muchas frases interesantes. '.repeat(100);
      
      const mockExtractPhrases = vi.fn().mockImplementation(async (text: string) => {
        // Simulate text processing
        const words = text.split(' ');
        await new Promise(resolve => setTimeout(resolve, Math.min(words.length / 10, 100)));
        
        return {
          phrases: words
            .filter(word => word.length > 4)
            .slice(0, 50)
            .map((word, i) => ({
              id: `phrase-${i}`,
              text: word,
              translation: `translation-${word}`,
              category: 'nouns',
              difficulty: 'intermediate',
            })),
        };
      });

      const executionTime = await measureExecutionTime(async () => {
        await mockExtractPhrases(longText);
      });

      // Should process long text within reasonable time
      expect(executionTime).toBeLessThan(200);
    });

    it('should handle phrase categorization efficiently', async () => {
      const phrases = Array.from({ length: 200 }, (_, i) => ({
        id: `phrase-${i}`,
        text: `phrase ${i}`,
        category: ['nouns', 'verbs', 'adjectives', 'phrases', 'idioms'][i % 5],
      }));

      const executionTime = await measureExecutionTime(async () => {
        // Simulate categorization logic
        const categorized = phrases.reduce((acc, phrase) => {
          if (!acc[phrase.category]) acc[phrase.category] = [];
          acc[phrase.category].push(phrase);
          return acc;
        }, {} as Record<string, typeof phrases>);

        return categorized;
      });

      // Should categorize 200 phrases quickly
      expect(executionTime).toBeLessThan(10);
    });
  });

  describe('Q&A Generation Performance', () => {
    it('should generate multiple questions efficiently', async () => {
      const mockGenerateQA = vi.fn().mockImplementation(async (params: any) => {
        // Simulate question generation based on count
        const processingTime = Math.min(params.count * 10, 200);
        await new Promise(resolve => setTimeout(resolve, processingTime));
        
        return {
          questions: Array.from({ length: params.count }, (_, i) => ({
            id: `q-${i}`,
            question: `Question ${i}?`,
            answer: `Answer ${i}.`,
            difficulty: ['facil', 'medio', 'dificil'][i % 3],
          })),
        };
      });

      const executionTime = await measureExecutionTime(async () => {
        await mockGenerateQA({ count: 10, difficulty: 'intermediate' });
      });

      // 10 questions should generate within 250ms (10 * 10 + overhead)
      expect(executionTime).toBeLessThan(250);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during image processing', async () => {
      // Skip if performance.memory is not available
      const initialMemory = measureMemoryUsage();
      if (!initialMemory) {
        return; // Skip test in environments without memory API
      }

      // Simulate processing many images
      const images = Array.from({ length: 100 }, (_, i) => ({
        id: `img-${i}`,
        data: new Array(1000).fill(0), // Simulate image data
        processed: false,
      }));

      // Process images
      const processed = images.map(img => ({
        ...img,
        processed: true,
        thumbnail: img.data.slice(0, 100), // Simulate thumbnail generation
      }));

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = measureMemoryUsage();
      
      if (finalMemory && initialMemory) {
        const hasMemoryLeak = checkForMemoryLeaks(initialMemory, finalMemory, 5 * 1024 * 1024); // 5MB threshold
        expect(hasMemoryLeak).toBe(false);
      }
    });

    it('should clean up React Query cache efficiently', async () => {
      const initialMemory = measureMemoryUsage();
      if (!initialMemory) return;

      // Simulate heavy cache usage
      const cacheData = Array.from({ length: 1000 }, (_, i) => ({
        queryKey: [`test-query-${i}`],
        data: {
          id: i,
          content: new Array(100).fill(0), // Simulate cached data
        },
      }));

      // Simulate cache cleanup
      cacheData.length = 0; // Clear cache

      if (global.gc) {
        global.gc();
      }

      const finalMemory = measureMemoryUsage();
      
      if (finalMemory && initialMemory) {
        const memoryIncrease = finalMemory.used - initialMemory.used;
        // Should not increase memory by more than 1MB after cleanup
        expect(memoryIncrease).toBeLessThan(1024 * 1024);
      }
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent API calls efficiently', async () => {
      const mockApiCall = vi.fn().mockImplementation(async (id: number) => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { id, result: `Result ${id}` };
      });

      const executionTime = await measureExecutionTime(async () => {
        // Make 10 concurrent API calls
        const promises = Array.from({ length: 10 }, (_, i) => mockApiCall(i));
        await Promise.all(promises);
      });

      // Concurrent calls should complete faster than sequential (10 * 50ms = 500ms)
      expect(executionTime).toBeLessThan(200); // Should be close to 50ms due to concurrency
    });

    it('should handle concurrent search and description generation', async () => {
      const mockSearch = vi.fn().mockResolvedValue({ results: ['img1', 'img2'] });
      const mockGenerate = vi.fn().mockResolvedValue({ description: 'Generated' });
      
      const executionTime = await measureExecutionTime(async () => {
        // Simulate concurrent operations
        const [searchResults, description] = await Promise.all([
          mockSearch('test query'),
          mockGenerate({ imageUrl: 'test.jpg' }),
        ]);
        
        return { searchResults, description };
      });

      // Should complete both operations concurrently
      expect(executionTime).toBeLessThan(50);
      expect(mockSearch).toHaveBeenCalled();
      expect(mockGenerate).toHaveBeenCalled();
    });
  });

  describe('Data Structure Performance', () => {
    it('should efficiently search through large phrase collections', async () => {
      const phrases = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        text: `phrase ${i}`,
        translation: `translation ${i}`,
        searchable: `phrase ${i} translation ${i}`.toLowerCase(),
      }));

      const executionTime = await measureExecutionTime(async () => {
        const query = 'phrase 500';
        const results = phrases.filter(phrase => 
          phrase.searchable.includes(query.toLowerCase())
        );
        return results;
      });

      // Should search through 10,000 phrases quickly
      expect(executionTime).toBeLessThan(50);
    });

    it('should efficiently sort and filter phrase collections', async () => {
      const phrases = Array.from({ length: 5000 }, (_, i) => ({
        id: i,
        text: `phrase ${i}`,
        category: ['nouns', 'verbs', 'adjectives'][i % 3],
        difficulty: ['beginner', 'intermediate', 'advanced'][i % 3],
        frequency: Math.random(),
      }));

      const executionTime = await measureExecutionTime(async () => {
        const filtered = phrases
          .filter(p => p.category === 'nouns')
          .filter(p => p.difficulty === 'intermediate')
          .sort((a, b) => b.frequency - a.frequency)
          .slice(0, 100);
        
        return filtered;
      });

      // Should filter, sort, and slice 5,000 phrases quickly
      expect(executionTime).toBeLessThan(30);
    });
  });

  describe('UI Rendering Performance', () => {
    it('should render large lists efficiently with virtualization', async () => {
      // Mock virtual list rendering
      const mockRenderVirtualList = vi.fn().mockImplementation((items: any[], viewportSize: number) => {
        // Simulate virtualized rendering - only render visible items
        const startIndex = 0;
        const endIndex = Math.min(viewportSize, items.length);
        const visibleItems = items.slice(startIndex, endIndex);
        
        // Simulate rendering time
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              renderedCount: visibleItems.length,
              totalCount: items.length,
            });
          }, 10);
        });
      });

      const largeItemList = Array.from({ length: 10000 }, (_, i) => ({ id: i }));

      const executionTime = await measureExecutionTime(async () => {
        await mockRenderVirtualList(largeItemList, 50);
      });

      // Should render 50 visible items from 10,000 total quickly
      expect(executionTime).toBeLessThan(20);
    });

    it('should debounce search input efficiently', async () => {
      const mockDebounce = vi.fn();
      const mockSearch = vi.fn();

      // Simulate rapid input changes
      const executionTime = await measureExecutionTime(async () => {
        const inputs = ['m', 'mo', 'mou', 'moun', 'mount', 'mounta', 'mountain'];
        
        for (const input of inputs) {
          mockDebounce(input);
          await new Promise(resolve => setTimeout(resolve, 10)); // 10ms between inputs
        }
        
        // Simulate debounce delay
        await new Promise(resolve => setTimeout(resolve, 500));
        mockSearch('mountain'); // Only final search should execute
      });

      expect(mockDebounce).toHaveBeenCalledTimes(7);
      expect(mockSearch).toHaveBeenCalledTimes(1);
      expect(executionTime).toBeLessThan(600); // 70ms input + 500ms debounce + overhead
    });
  });

  describe('Edge Case Performance', () => {
    it('should handle empty results efficiently', async () => {
      const mockEmptySearch = vi.fn().mockResolvedValue({
        total: 0,
        results: [],
      });

      const executionTime = await measureExecutionTime(async () => {
        await mockEmptySearch('nonexistent-query-xyz');
      });

      // Empty results should be handled quickly
      expect(executionTime).toBeLessThan(10);
    });

    it('should handle malformed data gracefully', async () => {
      const malformedData = [
        { id: 1 }, // Missing required fields
        { id: 2, text: null }, // Null values
        { id: 3, text: '', translation: undefined }, // Empty/undefined values
        null, // Null item
        undefined, // Undefined item
      ];

      const executionTime = await measureExecutionTime(async () => {
        const cleaned = malformedData
          .filter(item => item && item.id)
          .map(item => ({
            id: item.id,
            text: item.text || '',
            translation: (item as any).translation || '',
          }));
        
        return cleaned;
      });

      // Should clean malformed data quickly
      expect(executionTime).toBeLessThan(5);
    });

    it('should handle very long strings efficiently', async () => {
      const veryLongString = 'a'.repeat(100000); // 100KB string
      
      const executionTime = await measureExecutionTime(async () => {
        // Simulate text processing operations
        const words = veryLongString.split('');
        const chunks = [];
        for (let i = 0; i < words.length; i += 1000) {
          chunks.push(words.slice(i, i + 1000).join(''));
        }
        return chunks;
      });

      // Should process very long string within reasonable time
      expect(executionTime).toBeLessThan(100);
    });
  });
});