import { describe, it, expect } from "vitest";
import {
  importFromJSON,
  importFromCSV,
  importFromAnki,
  validateImportedData,
} from "../../../src/lib/import/importManager";

describe("importManager", () => {
  describe("importFromJSON", () => {
    it("should import valid JSON data", async () => {
      const jsonData = {
        vocabulary: [
          {
            spanish: "hola",
            english: "hello",
            category: "greetings",
            difficulty: "beginner",
          },
        ],
      };

      const file = new File([JSON.stringify(jsonData)], "test.json", {
        type: "application/json",
      });

      const result = await importFromJSON(file, { format: "json" });

      expect(result.success).toBe(true);
      expect(result.itemsImported).toBe(1);
      expect(result.data?.vocabulary).toHaveLength(1);
    });

    it("should handle invalid JSON", async () => {
      const file = new File(["invalid json{"], "test.json", {
        type: "application/json",
      });

      const result = await importFromJSON(file, { format: "json" });

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Invalid JSON format");
    });

    it("should handle empty JSON", async () => {
      const file = new File([JSON.stringify({})], "test.json", {
        type: "application/json",
      });

      const result = await importFromJSON(file, { format: "json" });

      expect(result.success).toBe(false);
      expect(result.warnings).toContain("No valid data found in file");
    });
  });

  describe("importFromCSV", () => {
    it("should import valid CSV data", async () => {
      const csvData = `spanish_text,english_translation,category,difficulty
hola,hello,greetings,beginner
gracias,thank you,politeness,beginner`;

      const file = new File([csvData], "test.csv", { type: "text/csv" });

      const result = await importFromCSV(file, { format: "csv" });

      expect(result.success).toBe(true);
      expect(result.itemsImported).toBe(2);
      expect(result.data?.vocabulary).toHaveLength(2);
    });

    it("should handle missing required fields", async () => {
      const csvData = `spanish_text,category
hola,greetings`;

      const file = new File([csvData], "test.csv", { type: "text/csv" });

      const result = await importFromCSV(file, { format: "csv" });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should handle quoted CSV values", async () => {
      const csvData = `spanish_text,english_translation,category
"hola, amigo","hello, friend",greetings`;

      const file = new File([csvData], "test.csv", { type: "text/csv" });

      const result = await importFromCSV(file, { format: "csv" });

      expect(result.success).toBe(true);
      expect(result.data?.vocabulary?.[0].spanish).toBe("hola, amigo");
    });
  });

  describe("importFromAnki", () => {
    it("should import Anki deck format", async () => {
      const ankiData = `hola\thello\tgreetings
gracias\tthank you\tpoliteness`;

      const file = new File([ankiData], "test.txt", { type: "text/plain" });

      const result = await importFromAnki(file, { format: "anki" });

      expect(result.success).toBe(true);
      expect(result.itemsImported).toBe(2);
      expect(result.data?.vocabulary).toHaveLength(2);
    });

    it("should handle lines without tags", async () => {
      const ankiData = `hola\thello`;

      const file = new File([ankiData], "test.txt", { type: "text/plain" });

      const result = await importFromAnki(file, { format: "anki" });

      expect(result.success).toBe(true);
      expect(result.data?.vocabulary?.[0].category).toBe("general");
    });
  });

  describe("validateImportedData", () => {
    it("should validate correct data", () => {
      const data = {
        vocabulary: [
          {
            spanish: "hola",
            english: "hello",
            category: "greetings",
            difficulty: "beginner" as const,
            partOfSpeech: "interjection" as const,
            context: { spanish: "", english: "" },
            dateAdded: new Date().toISOString(),
          },
        ],
      };

      const result = validateImportedData(data);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect missing required fields", () => {
      const data = {
        vocabulary: [
          {
            spanish: "",
            english: "hello",
            category: "greetings",
            difficulty: "beginner" as const,
            partOfSpeech: "interjection" as const,
            context: { spanish: "", english: "" },
            dateAdded: new Date().toISOString(),
          },
        ],
      };

      const result = validateImportedData(data);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
