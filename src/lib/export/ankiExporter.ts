/**
 * Anki Export Utilities for Vocabulary Learning App
 * Creates Anki-compatible deck files for spaced repetition learning
 */

import { saveAs } from "file-saver";
import { logger } from '@/lib/logger';
import {
  ExportData,
  AnkiExportOptions,
  VocabularyExportItem,
  DescriptionExportItem,
  QAExportItem,
} from "../../types/export";

interface AnkiCard {
  front: string;
  back: string;
  tags: string[];
  media?: string[];
}

interface AnkiDeck {
  name: string;
  description: string;
  cards: AnkiCard[];
  media: { [key: string]: string }; // filename -> data URL
}

export class AnkiExporter {
  private options: AnkiExportOptions;
  private deck: AnkiDeck;

  constructor(options: AnkiExportOptions = {}) {
    this.options = {
      deckName: "Language Learning Deck",
      noteType: "basic",
      tags: ["describe-it", "vocabulary"],
      includeImages: false,
      mediaFolder: "media",
      ...options,
    };

    this.deck = {
      name: this.options.deckName || "Language Learning Deck",
      description: "Exported from Describe It - Language Learning App",
      cards: [],
      media: {},
    };
  }

  /**
   * Main export function for Anki deck generation
   */
  async exportToAnki(data: ExportData): Promise<Blob> {
    try {
      // Process different data types into cards
      if (data.vocabulary && data.vocabulary.length > 0) {
        await this.processVocabularyCards(data.vocabulary);
      }

      if (data.qa && data.qa.length > 0) {
        await this.processQACards(data.qa);
      }

      if (data.descriptions && data.descriptions.length > 0) {
        await this.processDescriptionCards(data.descriptions);
      }

      // Generate the Anki package
      return await this.generateAnkiPackage();
    } catch (error) {
      logger.error("Error generating Anki deck:", error);
      throw new Error("Failed to generate Anki deck export");
    }
  }

  /**
   * Process vocabulary items into Anki cards
   */
  private async processVocabularyCards(
    vocabulary: VocabularyExportItem[],
  ): Promise<void> {
    for (const item of vocabulary) {
      const cards = await this.createVocabularyCards(item);
      this.deck.cards.push(...cards);
    }
  }

  /**
   * Create multiple card types from vocabulary item
   */
  private async createVocabularyCards(
    item: VocabularyExportItem,
  ): Promise<AnkiCard[]> {
    const cards: AnkiCard[] = [];
    const tags = [
      ...(this.options.tags || []),
      item.category,
      item.difficulty,
      item.partOfSpeech,
    ]
      .filter(Boolean)
      .map((tag) => tag.toLowerCase().replace(/\s+/g, "-"));

    // Basic card: Phrase -> Definition + Translation
    cards.push({
      front: this.formatCardFront(item.phrase, item.context),
      back: this.formatCardBack(item.definition, item.translation, item),
      tags,
    });

    // Reverse card: Definition -> Phrase (if enabled)
    if (
      this.options.noteType === "basic" ||
      this.options.noteType === "cloze"
    ) {
      cards.push({
        front: this.formatDefinitionFront(item.definition, item.translation),
        back: this.formatPhraseBack(item.phrase, item.context),
        tags: [...tags, "reverse"],
      });
    }

    // Context card: Context with cloze deletion
    if (item.context && this.options.noteType === "cloze") {
      cards.push({
        front: this.formatClozeCard(item.context, item.phrase),
        back: this.formatClozeBack(item.phrase, item.definition),
        tags: [...tags, "cloze", "context"],
      });
    }

    return cards;
  }

  /**
   * Process Q&A pairs into Anki cards
   */
  private async processQACards(qa: QAExportItem[]): Promise<void> {
    for (const item of qa) {
      const card = await this.createQACard(item);
      this.deck.cards.push(card);
    }
  }

  /**
   * Create card from Q&A pair
   */
  private async createQACard(item: QAExportItem): Promise<AnkiCard> {
    const tags = [
      ...(this.options.tags || []),
      "qa",
      item.category,
      item.difficulty,
    ]
      .filter(Boolean)
      .map((tag) => tag ? tag.toLowerCase().replace(/\s+/g, "-") : "");

    return {
      front: this.formatQuestionFront(item.question, item.imageUrl),
      back: this.formatAnswerBack(item.answer, item.confidence),
      tags,
    };
  }

  /**
   * Process descriptions into comprehension cards
   */
  private async processDescriptionCards(
    descriptions: DescriptionExportItem[],
  ): Promise<void> {
    for (const item of descriptions) {
      const cards = await this.createDescriptionCards(item);
      this.deck.cards.push(...cards);
    }
  }

  /**
   * Create comprehension cards from descriptions
   */
  private async createDescriptionCards(
    item: DescriptionExportItem,
  ): Promise<AnkiCard[]> {
    const cards: AnkiCard[] = [];
    const tags = [
      ...(this.options.tags || []),
      "description",
      item.style,
      item.language,
    ]
      .filter(Boolean)
      .map((tag) => tag.toLowerCase().replace(/\s+/g, "-"));

    // Main description card
    cards.push({
      front: this.formatImageDescriptionFront(item.imageUrl, item.style),
      back: this.formatDescriptionBack(item.content, item.wordCount),
      tags,
    });

    // Create comprehension questions from description
    const comprehensionCards = this.generateComprehensionCards(
      item.content,
      tags,
    );
    cards.push(...comprehensionCards);

    return cards;
  }

  /**
   * Generate comprehension questions from description text
   */
  private generateComprehensionCards(
    description: string,
    baseTags: string[],
  ): AnkiCard[] {
    const cards: AnkiCard[] = [];
    const sentences = description
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 10);

    // Create fill-in-the-blank cards from key sentences
    sentences.slice(0, 3).forEach((sentence, index) => {
      const words = sentence.trim().split(" ");
      if (words.length > 5) {
        // Remove a key word (not articles, prepositions, etc.)
        const keyWords = words.filter(
          (word) =>
            word.length > 3 &&
            ![
              "the",
              "and",
              "but",
              "or",
              "in",
              "on",
              "at",
              "by",
              "for",
              "with",
            ].includes(word.toLowerCase()),
        );

        if (keyWords.length > 0) {
          const targetWord =
            keyWords[Math.floor(Math.random() * keyWords.length)];
          const clozeText = sentence.replace(
            new RegExp(`\\b${targetWord}\\b`, "i"),
            "______",
          );

          cards.push({
            front: `<div class="cloze">Fill in the blank:<br><br><em>${clozeText.trim()}</em></div>`,
            back: `<div class="answer"><strong>${targetWord}</strong><br><br>Complete sentence:<br><em>${sentence.trim()}</em></div>`,
            tags: [...baseTags, "comprehension", "fill-blank"],
          });
        }
      }
    });

    return cards;
  }

  /**
   * Card formatting methods
   */
  private formatCardFront(phrase: string, context?: string): string {
    let html = `<div class="front-card">
      <div class="phrase">${this.escapeHtml(phrase)}</div>`;

    if (context) {
      html += `<div class="context"><em>Context: ${this.escapeHtml(context)}</em></div>`;
    }

    html += `</div>`;
    return html;
  }

  private formatCardBack(
    definition: string,
    translation: string,
    item: VocabularyExportItem,
  ): string {
    return `<div class="back-card">
      <div class="definition">
        <strong>Definition:</strong> ${this.escapeHtml(definition)}
      </div>
      <div class="translation">
        <strong>Translation:</strong> ${this.escapeHtml(translation)}
      </div>
      <div class="metadata">
        <div class="part-of-speech">
          <span class="label">Part of Speech:</span> 
          <span class="value">${this.escapeHtml(item.partOfSpeech)}</span>
        </div>
        <div class="difficulty difficulty-${item.difficulty}">
          <span class="label">Difficulty:</span> 
          <span class="value">${item.difficulty}</span>
        </div>
        <div class="category">
          <span class="label">Category:</span> 
          <span class="value">${this.escapeHtml(item.category)}</span>
        </div>
      </div>
    </div>`;
  }

  private formatDefinitionFront(
    definition: string,
    translation?: string,
  ): string {
    return `<div class="definition-front">
      <div class="definition">${this.escapeHtml(definition)}</div>
      ${translation ? `<div class="translation"><em>${this.escapeHtml(translation)}</em></div>` : ""}
      <div class="prompt">What word or phrase matches this definition?</div>
    </div>`;
  }

  private formatPhraseBack(phrase: string, context?: string): string {
    let html = `<div class="phrase-back">
      <div class="phrase"><strong>${this.escapeHtml(phrase)}</strong></div>`;

    if (context) {
      html += `<div class="context"><em>${this.escapeHtml(context)}</em></div>`;
    }

    html += `</div>`;
    return html;
  }

  private formatClozeCard(context: string, phrase: string): string {
    const clozeText = context.replace(
      new RegExp(`\\b${phrase}\\b`, "gi"),
      `{{c1::${phrase}}}`,
    );
    return `<div class="cloze-card">${this.escapeHtml(clozeText)}</div>`;
  }

  private formatClozeBack(phrase: string, definition: string): string {
    return `<div class="cloze-back">
      <div class="phrase"><strong>${this.escapeHtml(phrase)}</strong></div>
      <div class="definition">${this.escapeHtml(definition)}</div>
    </div>`;
  }

  private formatQuestionFront(question: string, imageUrl?: string): string {
    let html = `<div class="qa-front">`;

    if (imageUrl && this.options.includeImages) {
      html += `<div class="image"><img src="${imageUrl}" alt="Question image" style="max-width: 300px; max-height: 200px;"></div>`;
    }

    html += `<div class="question">${this.escapeHtml(question)}</div></div>`;
    return html;
  }

  private formatAnswerBack(answer: string, confidence?: number): string {
    let html = `<div class="qa-back">
      <div class="answer">${this.escapeHtml(answer)}</div>`;

    if (confidence) {
      html += `<div class="confidence">Confidence: ${Math.round(confidence * 100)}%</div>`;
    }

    html += `</div>`;
    return html;
  }

  private formatImageDescriptionFront(
    imageUrl?: string,
    style?: string,
  ): string {
    let html = `<div class="description-front">`;

    if (imageUrl && this.options.includeImages) {
      html += `<div class="image"><img src="${imageUrl}" alt="Description image" style="max-width: 400px; max-height: 300px;"></div>`;
    }

    html += `<div class="prompt">Describe this image in ${style} style.</div></div>`;
    return html;
  }

  private formatDescriptionBack(content: string, wordCount: number): string {
    return `<div class="description-back">
      <div class="content">${this.escapeHtml(content)}</div>
      <div class="word-count">Word count: ${wordCount}</div>
    </div>`;
  }

  /**
   * Generate Anki package (simplified - creates TSV format)
   */
  private async generateAnkiPackage(): Promise<Blob> {
    // Create TSV content for Anki import
    const tsvLines = [
      "#separator:tab",
      "#html:true",
      "#deck:" + this.deck.name,
    ];

    // Add cards
    this.deck.cards.forEach((card) => {
      const tags = card.tags.join(" ");
      const line = [card.front, card.back, tags].join("\t");
      tsvLines.push(line);
    });

    // Add CSS styling
    const css = this.generateCardCSS();
    tsvLines.push("#css:");
    tsvLines.push(css);

    const tsvContent = tsvLines.join("\n");

    return new Blob([tsvContent], {
      type: "text/tab-separated-values;charset=utf-8",
    });
  }

  /**
   * Generate CSS for card styling
   */
  private generateCardCSS(): string {
    return `
/* Describe It Anki Cards Styling */
.card {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: #2c3e50;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.front-card, .back-card {
  max-width: 600px;
  margin: 0 auto;
}

.phrase {
  font-size: 24px;
  font-weight: bold;
  color: #2980b9;
  margin-bottom: 15px;
  text-align: center;
  border-bottom: 2px solid #3498db;
  padding-bottom: 10px;
}

.context {
  font-style: italic;
  color: #7f8c8d;
  margin-bottom: 15px;
  padding: 10px;
  background: rgba(255,255,255,0.7);
  border-radius: 6px;
  border-left: 4px solid #9b59b6;
}

.definition, .translation {
  margin-bottom: 12px;
  padding: 8px;
}

.definition {
  background: rgba(46, 204, 113, 0.1);
  border-left: 4px solid #2ecc71;
}

.translation {
  background: rgba(52, 152, 219, 0.1);
  border-left: 4px solid #3498db;
}

.metadata {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #bdc3c7;
}

.metadata .label {
  font-weight: bold;
  color: #34495e;
}

.metadata .value {
  color: #7f8c8d;
}

.difficulty-beginner .value { color: #27ae60; }
.difficulty-intermediate .value { color: #f39c12; }
.difficulty-advanced .value { color: #e74c3c; }

.qa-front, .qa-back {
  text-align: center;
}

.question {
  font-size: 20px;
  margin-bottom: 15px;
  color: #8e44ad;
}

.answer {
  font-size: 18px;
  color: #27ae60;
  font-weight: bold;
}

.image {
  text-align: center;
  margin-bottom: 15px;
}

.image img {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.cloze-card {
  font-size: 18px;
  line-height: 1.8;
  text-align: justify;
}

.cloze {
  background: rgba(241, 196, 15, 0.2);
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid #f1c40f;
}

.confidence {
  margin-top: 10px;
  font-size: 14px;
  color: #95a5a6;
}

.word-count {
  font-size: 12px;
  color: #95a5a6;
  margin-top: 10px;
  text-align: right;
}

.prompt {
  font-style: italic;
  color: #7f8c8d;
  text-align: center;
  margin-top: 15px;
  padding: 10px;
  background: rgba(255,255,255,0.5);
  border-radius: 6px;
}
`;
  }

  /**
   * Utility function to escape HTML
   */
  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

/**
 * Export vocabulary to Anki deck format
 */
export async function exportToAnki(
  data: ExportData,
  options: AnkiExportOptions = {},
): Promise<Blob> {
  const exporter = new AnkiExporter(options);
  return await exporter.exportToAnki(data);
}

/**
 * Export vocabulary only to Anki deck
 */
export async function exportVocabularyToAnki(
  vocabularyData: VocabularyExportItem[],
  options: AnkiExportOptions = {},
): Promise<Blob> {
  const data: ExportData = {
    metadata: {
      exportId: `anki-vocab-${Date.now()}`,
      createdAt: new Date().toISOString(),
      format: "anki",
      options: { format: "anki", categories: ["vocabulary"] },
      totalItems: vocabularyData.length,
      categories: ["vocabulary"],
      version: "1.0.0",
    },
    vocabulary: vocabularyData,
  };

  const ankiOptions: AnkiExportOptions = {
    deckName: "Vocabulary Deck",
    noteType: "basic",
    tags: ["vocabulary", "describe-it"],
    includeImages: false,
    ...options,
  };

  return await exportToAnki(data, ankiOptions);
}

/**
 * Download Anki deck file
 */
export function downloadAnkiDeck(blob: Blob, deckName: string): void {
  const filename = deckName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
  saveAs(blob, `${filename}.txt`);
}
