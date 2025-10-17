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
      escapeCsvValue(item.phrase_text || ""),
      escapeCsvValue(item.translation || ""),
      escapeCsvValue(item.definition || ""),
      escapeCsvValue(item.category || ""),
      escapeCsvValue(item.part_of_speech || ""),
      escapeCsvValue(item.difficulty_level?.toString() || ""),
      escapeCsvValue(item.example_usage || ""),
      escapeCsvValue(item.pronunciation || ""),
      escapeCsvValue(item.notes || ""),
      escapeCsvValue(item.image_url || "")
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
        phrase_text: item.phrase_text,
        translation: item.translation,
        definition: item.definition,
        category: item.category,
        part_of_speech: item.part_of_speech,
        difficulty_level: item.difficulty_level,
        example_usage: item.example_usage,
        pronunciation: item.pronunciation,
        notes: item.notes,
        image_url: item.image_url,
        audio_url: item.audio_url,
        tags: item.tags,
        context: item.context
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
        id: "", // Will be generated on save
        user_id: "", // Will be set on save
        phrase_text: values[0] || "",
        translation: values[1] || null,
        definition: values[2] || null,
        category: values[3] || "general",
        part_of_speech: values[4] || null,
        difficulty_level: parseFloat(values[5]) || 1,
        example_usage: values[6] || null,
        pronunciation: values[7] || null,
        notes: values[8] || null,
        image_url: values[9] || null,
        audio_url: null,
        tags: [],
        context: null,
        is_user_selected: true,
        is_mastered: false,
        study_count: 0,
        correct_count: 0,
        last_studied_at: null,
        mastered_at: null,
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

    const items: VocabularyItem[] = data.items.map((item: any) => ({
      id: "", // Will be generated on save
      user_id: "", // Will be set on save
      phrase_text: item.phrase_text || "",
      translation: item.translation || null,
      definition: item.definition || null,
      category: item.category || "general",
      part_of_speech: item.part_of_speech || null,
      difficulty_level: item.difficulty_level || 1,
      example_usage: item.example_usage || null,
      pronunciation: item.pronunciation || null,
      notes: item.notes || null,
      image_url: item.image_url || null,
      audio_url: item.audio_url || null,
      tags: item.tags || [],
      context: item.context || null,
      is_user_selected: true,
      is_mastered: false,
      study_count: 0,
      correct_count: 0,
      last_studied_at: null,
      mastered_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Validate required fields
    const validItems = items.filter(item => {
      if (!item.phrase_text) {
        logger.warn("Skipping item: missing phrase text");
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

    if (!item.phrase_text || item.phrase_text.trim().length === 0) {
      itemErrors.push(`Item ${index + 1}: Missing phrase text`);
    }

    if (item.phrase_text && item.phrase_text.length > 500) {
      itemErrors.push(`Item ${index + 1}: Phrase text too long (max 500 characters)`);
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
