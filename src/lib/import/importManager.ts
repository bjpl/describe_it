/**
 * Import Manager for Vocabulary Learning App
 * Handles importing data from various formats
 */

import { logger } from '@/lib/logger';
import { safeParse } from '@/lib/utils/json-safe';
import type {
  VocabularyExportItem,
  DescriptionExportItem,
  QAExportItem,
  SessionExportItem,
} from '@/types/export';

export interface ImportResult {
  success: boolean;
  itemsImported: number;
  errors: string[];
  warnings: string[];
  data?: ImportedData;
}

export interface ImportedData {
  vocabulary?: VocabularyExportItem[];
  descriptions?: DescriptionExportItem[];
  qa?: QAExportItem[];
  sessions?: SessionExportItem[];
}

export interface ImportOptions {
  format: 'json' | 'csv' | 'anki';
  validateData?: boolean;
  skipDuplicates?: boolean;
  mergeStrategy?: 'replace' | 'merge' | 'skip';
}

/**
 * Import data from JSON file
 */
export async function importFromJSON(
  file: File,
  options: ImportOptions = { format: 'json' }
): Promise<ImportResult> {
  try {
    const text = await file.text();
    const parsed = safeParse<any>(text);

    if (!parsed) {
      return {
        success: false,
        itemsImported: 0,
        errors: ['Invalid JSON format'],
        warnings: [],
      };
    }

    // Validate structure
    const data: ImportedData = {};
    const errors: string[] = [];
    const warnings: string[] = [];
    let totalItems = 0;

    // Extract vocabulary
    if (parsed.vocabulary && Array.isArray(parsed.vocabulary)) {
      data.vocabulary = parsed.vocabulary;
      totalItems += parsed.vocabulary.length;
    } else if (parsed.data?.vocabulary) {
      data.vocabulary = parsed.data.vocabulary;
      totalItems += parsed.data.vocabulary.length;
    }

    // Extract descriptions
    if (parsed.descriptions && Array.isArray(parsed.descriptions)) {
      data.descriptions = parsed.descriptions;
      totalItems += parsed.descriptions.length;
    } else if (parsed.data?.descriptions) {
      data.descriptions = parsed.data.descriptions;
      totalItems += parsed.data.descriptions.length;
    }

    // Extract Q&A
    if (parsed.qa && Array.isArray(parsed.qa)) {
      data.qa = parsed.qa;
      totalItems += parsed.qa.length;
    } else if (parsed.data?.qa) {
      data.qa = parsed.data.qa;
      totalItems += parsed.data.qa.length;
    }

    // Extract sessions
    if (parsed.sessions && Array.isArray(parsed.sessions)) {
      data.sessions = parsed.sessions;
      totalItems += parsed.sessions.length;
    } else if (parsed.data?.sessions) {
      data.sessions = parsed.data.sessions;
      totalItems += parsed.data.sessions.length;
    }

    if (totalItems === 0) {
      warnings.push('No valid data found in file');
    }

    return {
      success: totalItems > 0,
      itemsImported: totalItems,
      errors,
      warnings,
      data,
    };
  } catch (error) {
    logger.error('JSON import failed:', error);
    return {
      success: false,
      itemsImported: 0,
      errors: [error instanceof Error ? error.message : 'Unknown import error'],
      warnings: [],
    };
  }
}

/**
 * Import data from CSV file
 */
export async function importFromCSV(
  file: File,
  options: ImportOptions = { format: 'csv' }
): Promise<ImportResult> {
  try {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      return {
        success: false,
        itemsImported: 0,
        errors: ['Empty CSV file'],
        warnings: [],
      };
    }

    const vocabulary: VocabularyExportItem[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Parse header
    const headers = parseCSVLine(lines[0]);
    const requiredFields = ['spanish_text', 'english_translation'];
    const missingFields = requiredFields.filter(field => !headers.includes(field));

    if (missingFields.length > 0) {
      errors.push(`Missing required fields: ${missingFields.join(', ')}`);
      return {
        success: false,
        itemsImported: 0,
        errors,
        warnings,
      };
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        if (values.length !== headers.length) {
          warnings.push(`Row ${i + 1}: Column count mismatch`);
          continue;
        }

        const item: any = {};
        headers.forEach((header, index) => {
          item[header] = values[index];
        });

        // Convert to VocabularyExportItem
        const vocabItem: VocabularyExportItem = {
          spanish: item.spanish_text || '',
          english: item.english_translation || '',
          category: item.category || 'general',
          difficulty: (item.difficulty || 'beginner') as any,
          partOfSpeech: item.part_of_speech || 'noun',
          context: {
            spanish: item.context_sentence_spanish || '',
            english: item.context_sentence_english || '',
          },
          dateAdded: item.created_at || new Date().toISOString(),
        };

        vocabulary.push(vocabItem);
      } catch (error) {
        warnings.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Parse error'}`);
      }
    }

    return {
      success: vocabulary.length > 0,
      itemsImported: vocabulary.length,
      errors,
      warnings,
      data: { vocabulary },
    };
  } catch (error) {
    logger.error('CSV import failed:', error);
    return {
      success: false,
      itemsImported: 0,
      errors: [error instanceof Error ? error.message : 'Unknown import error'],
      warnings: [],
    };
  }
}

/**
 * Parse CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Import from Anki deck file
 */
export async function importFromAnki(
  file: File,
  options: ImportOptions = { format: 'anki' }
): Promise<ImportResult> {
  try {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());

    const vocabulary: VocabularyExportItem[] = [];
    const warnings: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Anki format: front\tback\ttags (tab-separated)
      const parts = line.split('\t');
      if (parts.length < 2) {
        warnings.push(`Line ${i + 1}: Invalid Anki format`);
        continue;
      }

      const vocabItem: VocabularyExportItem = {
        spanish: parts[0].trim(),
        english: parts[1].trim(),
        category: parts[2] ? parts[2].trim() : 'general',
        difficulty: 'beginner',
        partOfSpeech: 'noun',
        context: {
          spanish: '',
          english: '',
        },
        dateAdded: new Date().toISOString(),
      };

      vocabulary.push(vocabItem);
    }

    return {
      success: vocabulary.length > 0,
      itemsImported: vocabulary.length,
      errors: [],
      warnings,
      data: { vocabulary },
    };
  } catch (error) {
    logger.error('Anki import failed:', error);
    return {
      success: false,
      itemsImported: 0,
      errors: [error instanceof Error ? error.message : 'Unknown import error'],
      warnings: [],
    };
  }
}

/**
 * Main import function that delegates to format-specific handlers
 */
export async function importData(file: File, options: ImportOptions): Promise<ImportResult> {
  switch (options.format) {
    case 'json':
      return importFromJSON(file, options);
    case 'csv':
      return importFromCSV(file, options);
    case 'anki':
      return importFromAnki(file, options);
    default:
      return {
        success: false,
        itemsImported: 0,
        errors: [`Unsupported format: ${options.format}`],
        warnings: [],
      };
  }
}

/**
 * Validate imported data structure
 */
export function validateImportedData(data: ImportedData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (data.vocabulary) {
    data.vocabulary.forEach((item, index) => {
      if (!item.spanish || !item.english) {
        errors.push(`Vocabulary item ${index + 1}: Missing required fields`);
      }
    });
  }

  if (data.descriptions) {
    data.descriptions.forEach((item, index) => {
      if (!item.spanish || !item.english) {
        errors.push(`Description item ${index + 1}: Missing required fields`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
