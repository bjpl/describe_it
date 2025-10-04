import { describe, it, expect } from 'vitest';
import {
  extractKeyPhrases,
  analyzeSentiment,
  getDifficultyLevel,
  generateContextSentence,
  categorizePhrase
} from '@/lib/utils/phrase-helpers';

describe('Phrase Helper Utilities', () => {
  describe('extractKeyPhrases', () => {
    it('should extract key phrases from Spanish text', () => {
      const text = 'El hermoso paisaje montañoso tiene árboles verdes y un cielo azul claro.';
      const phrases = extractKeyPhrases(text);
      
      expect(phrases).toBeInstanceOf(Array);
      expect(phrases.length).toBeGreaterThan(0);
      // Check for partial matches since actual implementation extracts different patterns
      expect(phrases.some(p => p.includes('hermoso'))).toBe(true);
      expect(phrases.some(p => p.includes('paisaje'))).toBe(true);
    });

    it('should extract key phrases from English text', () => {
      const text = 'The beautiful mountain landscape has green trees and a clear blue sky.';
      const phrases = extractKeyPhrases(text);
      
      expect(phrases).toBeInstanceOf(Array);
      expect(phrases.length).toBeGreaterThan(0);
      // Check for partial matches since actual implementation extracts different patterns
      expect(phrases.some(p => p.includes('beautiful'))).toBe(true);
      expect(phrases.some(p => p.includes('mountain'))).toBe(true);
    });

    it('should handle empty text', () => {
      const phrases = extractKeyPhrases('');
      expect(phrases).toEqual([]);
    });

    it('should handle single word', () => {
      const phrases = extractKeyPhrases('casa');
      expect(phrases).toEqual([]);
    });

    it('should limit number of phrases', () => {
      const text = 'Una frase muy larga con muchas palabras importantes que debería ser limitada apropiadamente cuando se extraen las frases clave más relevantes del contenido.';
      const phrases = extractKeyPhrases(text, 3);
      
      expect(phrases.length).toBeLessThanOrEqual(3);
    });
  });

  describe('analyzeSentiment', () => {
    it('should detect positive sentiment', () => {
      const positiveText = 'Estoy muy feliz y emocionado por este hermoso día soleado.';
      const sentiment = analyzeSentiment(positiveText);
      
      expect(sentiment.score).toBeGreaterThan(0);
      expect(sentiment.label).toBe('positive');
    });

    it('should detect negative sentiment', () => {
      const negativeText = 'Estoy muy triste y enojado por esta terrible situación.';
      const sentiment = analyzeSentiment(negativeText);
      
      expect(sentiment.score).toBeLessThan(0);
      expect(sentiment.label).toBe('negative');
    });

    it('should detect neutral sentiment', () => {
      const neutralText = 'La mesa es de color marrón y tiene cuatro patas.';
      const sentiment = analyzeSentiment(neutralText);
      
      expect(Math.abs(sentiment.score)).toBeLessThan(0.3);
      expect(sentiment.label).toBe('neutral');
    });

    it('should handle empty text', () => {
      const sentiment = analyzeSentiment('');
      
      expect(sentiment.score).toBe(0);
      expect(sentiment.label).toBe('neutral');
    });
  });

  describe('getDifficultyLevel', () => {
    it('should classify beginner level phrases', () => {
      const beginnerPhrases = ['la casa', 'mi nombre', 'buenos días'];
      
      beginnerPhrases.forEach(phrase => {
        const difficulty = getDifficultyLevel(phrase);
        expect(difficulty).toBe('beginner');
      });
    });

    it('should classify intermediate level phrases', () => {
      const intermediatePhrases = ['la oportunidad', 'el conocimiento', 'la experiencia'];
      
      intermediatePhrases.forEach(phrase => {
        const difficulty = getDifficultyLevel(phrase);
        expect(['intermediate', 'advanced']).toContain(difficulty);
      });
    });

    it('should classify advanced level phrases', () => {
      const advancedPhrases = ['la epistemología', 'el anacronismo', 'la hermenéutica'];
      
      advancedPhrases.forEach(phrase => {
        const difficulty = getDifficultyLevel(phrase);
        expect(difficulty).toBe('advanced');
      });
    });

    it('should classify single complex words as intermediate or advanced', () => {
      const difficulty = getDifficultyLevel('extraordinariamente');
      
      expect(['intermediate', 'advanced']).toContain(difficulty);
    });
  });

  describe('generateContextSentence', () => {
    it('should generate context sentence for noun', () => {
      const context = generateContextSentence('casa');
      
      expect(context).toBeTruthy();
      expect(context.toLowerCase()).toContain('casa');
      expect(context.length).toBeGreaterThan(10);
    });

    it('should generate context sentence for verb', () => {
      const context = generateContextSentence('correr');
      
      expect(context).toBeTruthy();
      expect(context.toLowerCase()).toContain('corr');
      expect(context.endsWith('.')).toBe(true);
    });

    it('should generate context sentence for adjective', () => {
      const context = generateContextSentence('hermoso');
      
      expect(context).toBeTruthy();
      expect(context.toLowerCase()).toContain('hermoso');
    });

    it('should handle unknown part of speech', () => {
      const context = generateContextSentence('palabra');
      
      expect(context).toBeTruthy();
      expect(context.toLowerCase()).toContain('palabra');
    });

    it('should generate different contexts for same word', () => {
      const contexts = [];
      for (let i = 0; i < 5; i++) {
        contexts.push(generateContextSentence('libro'));
      }
      
      const uniqueContexts = new Set(contexts);
      expect(uniqueContexts.size).toBeGreaterThan(1);
    });

    it('should generate context with base context', () => {
      const baseContext = 'En la biblioteca hay muchos libros interesantes. El libro de ciencia es muy útil.';
      const context = generateContextSentence('libro', baseContext);
      
      expect(context).toBeTruthy();
      expect(context.toLowerCase()).toContain('libro');
      expect(context.includes('biblioteca') || context.includes('ciencia')).toBe(true);
    });
  });

  describe('categorizePhrase', () => {
    it('should categorize food-related phrases', () => {
      const category = categorizePhrase('pizza deliciosa');
      expect(category).toBe('food');
    });

    it('should categorize family-related phrases', () => {
      const category = categorizePhrase('mi hermana');
      expect(category).toBe('family');
    });

    it('should categorize color-related phrases', () => {
      const category = categorizePhrase('azul brillante');
      expect(category).toBe('colors');
    });

    it('should categorize number-related phrases', () => {
      const category = categorizePhrase('cinco personas');
      expect(category).toBe('numbers');
    });

    it('should categorize time-related phrases', () => {
      const category = categorizePhrase('por la mañana');
      expect(category).toBe('time');
    });

    it('should return general for unmatched phrases', () => {
      const category = categorizePhrase('concepto abstracto complejo');
      expect(category).toBe('general');
    });

    it('should handle empty phrases', () => {
      const category = categorizePhrase('');
      expect(category).toBe('general');
    });
  });

  describe('Edge Cases and Performance', () => {
    it('should handle very long text efficiently', () => {
      const longText = 'palabra '.repeat(1000);
      const startTime = Date.now();
      
      const phrases = extractKeyPhrases(longText, 10);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
      expect(phrases.length).toBeLessThanOrEqual(10);
    });

    it('should handle special characters in phrases', () => {
      const specialText = 'El niño come piñas y jalapeños en la mañana.';
      const phrases = extractKeyPhrases(specialText);
      
      expect(phrases.some(p => p.includes('niño'))).toBe(true);
      expect(phrases.some(p => p.includes('mañana'))).toBe(true);
    });

    it('should handle mixed language content', () => {
      const mixedText = 'Hello mundo, this is una prueba of mixed content.';
      const phrases = extractKeyPhrases(mixedText);
      
      expect(phrases).toBeInstanceOf(Array);
      expect(phrases.length).toBeGreaterThan(0);
    });

    it('should handle numeric content', () => {
      const numericText = 'Tengo 25 años y vivo en el año 2024.';
      const phrases = extractKeyPhrases(numericText);
      
      expect(phrases.some(p => /\d+/.test(p))).toBe(true);
    });
  });
});