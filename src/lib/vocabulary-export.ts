/**
 * Vocabulary Export/Import Utilities
 * Handles exporting and importing vocabulary lists in CSV and JSON formats
 */

import type { VocabularyItem, VocabularyList } from "@/types/database";
import { logger } from "./logger";

export interface VocabularyExportData {
  list: VocabularyList;
  items: VocabularyItem[];
}

/**
 * Export vocabulary list to CSV format
 */
export function exportToCSV(data: VocabularyExportData): void {
  try {
    const { list, items } = data;

    // CSV headers
    const headers = [
      "Phrase",
      "Translation",
      "Definition",
      "Category",
      "Part of Speech",
      "Difficulty Level",
      "Example Usage",
      "Pronunciation",
      "Notes",
      "Image URL"
    ];

    // Convert items to CSV rows
    const rows = items.map(item => [
      escapeCsvValue(item.spanish_text || ""),
      escapeCsvValue(item.english_translation || ""),
      escapeCsvValue(item.context_sentence_english || ""),
      escapeCsvValue(item.category || ""),
      escapeCsvValue(item.part_of_speech || ""),
      escapeCsvValue(item.difficulty_level?.toString() || ""),
      escapeCsvValue(item.context_sentence_spanish || ""),
      escapeCsvValue(item.phonetic_pronunciation || item.pronunciation_ipa || ""),
      escapeCsvValue(item.user_notes || ""),
      escapeCsvValue(item.associated_image_urls?.[0] || "")
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    // Create and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const filename = `${sanitizeFilename(list.name)}_${new Date().toISOString().split('T')[0]}.csv`;
    downloadFile(blob, filename);

    logger.info("CSV export successful", { listId: list.id, itemCount: items.length });
  } catch (error) {
    logger.error("CSV export failed", error);
    throw new Error("Failed to export vocabulary to CSV");
  }
}

/**
 * Export vocabulary list to JSON format
 */
export function exportToJSON(data: VocabularyExportData): void {
  try {
    const { list, items } = data;

    const exportData = {
      metadata: {
        name: list.name,
        description: list.description,
        exportedAt: new Date().toISOString(),
        version: "1.0",
        itemCount: items.length
      },
      list: {
        id: list.id,
        name: list.name,
        description: list.description,
        created_at: list.created_at,
        updated_at: list.updated_at
      },
      items: items.map(item => ({
        spanish_text: item.spanish_text,
        english_translation: item.english_translation,
        category: item.category,
        part_of_speech: item.part_of_speech,
        difficulty_level: item.difficulty_level,
        context_sentence_spanish: item.context_sentence_spanish,
        context_sentence_english: item.context_sentence_english,
        phonetic_pronunciation: item.phonetic_pronunciation,
        pronunciation_ipa: item.pronunciation_ipa,
        user_notes: item.user_notes,
        associated_image_urls: item.associated_image_urls,
        audio_url: item.audio_url,
        frequency_score: item.frequency_score
      }))
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
    const filename = `${sanitizeFilename(list.name)}_${new Date().toISOString().split('T')[0]}.json`;
    downloadFile(blob, filename);

    logger.info("JSON export successful", { listId: list.id, itemCount: items.length });
  } catch (error) {
    logger.error("JSON export failed", error);
    throw new Error("Failed to export vocabulary to JSON");
  }
}

/**
 * Parse CSV file and extract vocabulary items
 */
export async function importFromCSV(file: File): Promise<VocabularyItem[]> {
  try {
    const text = await file.text();
    const lines = text.split("\n").filter(line => line.trim());

    if (lines.length < 2) {
      throw new Error("CSV file is empty or has no data rows");
    }

    // Skip header row
    const dataLines = lines.slice(1);
    const items: VocabularyItem[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      const values = parseCSVLine(line);

      // Validate minimum required fields
      if (!values[0]) {
        logger.warn(`Skipping row ${i + 2}: missing phrase text`);
        continue;
      }

      items.push({
        id: `temp_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`, // Temporary ID
        spanish_text: values[0] || "",
        english_translation: values[1] || "",
        category: values[3] || "general",
        part_of_speech: values[4] || "other",
        difficulty_level: parseFloat(values[5]) || 2,
        context_sentence_spanish: values[6] || undefined,
        context_sentence_english: values[2] || undefined,
        phonetic_pronunciation: values[7] || undefined,
        user_notes: values[8] || undefined,
        associated_image_urls: values[9] ? [values[9]] : undefined,
        audio_url: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    logger.info("CSV import successful", { itemCount: items.length });
    return items;
  } catch (error) {
    logger.error("CSV import failed", error);
    throw new Error(`Failed to import CSV: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Parse JSON file and extract vocabulary items
 */
export async function importFromJSON(file: File): Promise<VocabularyItem[]> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // Validate JSON structure
    if (!data.items || !Array.isArray(data.items)) {
      throw new Error("Invalid JSON format: missing or invalid 'items' array");
    }

    const items: VocabularyItem[] = data.items.map((item: any, idx: number) => ({
      id: item.id || `temp_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 9)}`,
      spanish_text: item.spanish_text || item.phrase_text || "",
      english_translation: item.english_translation || item.translation || "",
      category: item.category || "general",
      part_of_speech: item.part_of_speech || "other",
      difficulty_level: item.difficulty_level || 2,
      context_sentence_spanish: item.context_sentence_spanish || item.example_usage || undefined,
      context_sentence_english: item.context_sentence_english || item.definition || undefined,
      phonetic_pronunciation: item.phonetic_pronunciation || item.pronunciation || undefined,
      pronunciation_ipa: item.pronunciation_ipa || undefined,
      user_notes: item.user_notes || item.notes || undefined,
      associated_image_urls: item.associated_image_urls || (item.image_url ? [item.image_url] : undefined),
      audio_url: item.audio_url || undefined,
      frequency_score: item.frequency_score || undefined,
      created_at: item.created_at || new Date().toISOString(),
      updated_at: item.updated_at || new Date().toISOString()
    }));

    // Validate required fields
    const validItems = items.filter(item => {
      if (!item.spanish_text) {
        logger.warn("Skipping item: missing spanish text");
        return false;
      }
      return true;
    });

    logger.info("JSON import successful", { itemCount: validItems.length });
    return validItems;
  } catch (error) {
    logger.error("JSON import failed", error);
    throw new Error(`Failed to import JSON: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Validate imported items before saving
 */
export function validateImportedItems(items: VocabularyItem[]): {
  valid: VocabularyItem[];
  errors: string[];
} {
  const valid: VocabularyItem[] = [];
  const errors: string[] = [];

  items.forEach((item, index) => {
    const itemErrors: string[] = [];

    if (!item.spanish_text || item.spanish_text.trim().length === 0) {
      itemErrors.push(`Item ${index + 1}: Missing spanish text`);
    }

    if (item.spanish_text && item.spanish_text.length > 500) {
      itemErrors.push(`Item ${index + 1}: Spanish text too long (max 500 characters)`);
    }

    if (item.difficulty_level && (item.difficulty_level < 1 || item.difficulty_level > 10)) {
      itemErrors.push(`Item ${index + 1}: Difficulty level must be between 1 and 10`);
    }

    if (itemErrors.length > 0) {
      errors.push(...itemErrors);
    } else {
      valid.push(item);
    }
  });

  return { valid, errors };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Escape CSV value to handle commas, quotes, and newlines
 */
function escapeCsvValue(value: string): string {
  if (!value) return "";

  // If value contains comma, quote, or newline, wrap in quotes and escape existing quotes
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

/**
 * Parse a CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current.trim());

  return result;
}

/**
 * Sanitize filename by removing invalid characters
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-z0-9_\-]/gi, "_")
    .replace(/_+/g, "_")
    .toLowerCase();
}

/**
 * Trigger file download in browser
 */
function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
