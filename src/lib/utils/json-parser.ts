import { logger } from '@/lib/logger';
import { safeParse } from './json-safe';

// Re-export json-safe utilities for convenience
export { safeParse, safeStringify, safeDeepClone, safeParseLocalStorage, safeSetLocalStorage } from './json-safe';

/**
 * Robust JSON extraction and parsing utility for handling OpenAI API responses
 * that may contain markdown-wrapped JSON or mixed text content
 */

interface ParseResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  method?: string;
  originalContent?: string;
}

interface JSONParserOptions {
  logging?: boolean;
  fallbackValue?: any;
  maxRetries?: number;
  strictMode?: boolean;
}

export class RobustJSONParser {
  private static readonly JSON_BLOCK_REGEX = /```(?:json)?\s*([\s\S]*?)\s*```/g;
  private static readonly JSON_OBJECT_REGEX = /\{[\s\S]*\}/;
  private static readonly JSON_ARRAY_REGEX = /\[[\s\S]*\]/;

  /**
   * Main parsing method with multiple fallback strategies
   */
  static parse<T = any>(
    content: string,
    options: JSONParserOptions = {},
  ): ParseResult<T> {
    const {
      logging = true,
      fallbackValue,
      maxRetries = 3,
      strictMode = false,
    } = options;

    if (!content || typeof content !== "string") {
      return {
        success: false,
        error: "Invalid or empty content provided",
        originalContent: content,
      };
    }

    const strategies = [
      () => this.parseDirectJSON(content),
      () => this.parseFromMarkdownBlocks(content),
      () => this.extractAndParseJSON(content),
      () => this.parseWithCleaning(content),
      () => this.parseWithRepairs(content),
    ];

    if (!strictMode) {
      strategies.push(() => this.parseWithAggressiveCleaning(content));
    }

    let lastError = "";

    for (
      let attempt = 0;
      attempt < Math.min(maxRetries, strategies.length);
      attempt++
    ) {
      try {
        const strategy = strategies[attempt];
        const result = strategy();

        if (result.success) {
          if (logging) {
            logger.info(
              `✅ JSON parsed successfully using method: ${result.method}`,
            );
          }
          return result as ParseResult<T>;
        }

        lastError = result.error || "Unknown parsing error";
      } catch (error) {
        lastError =
          error instanceof Error ? error.message : "Parsing strategy failed";
        if (logging) {
          logger.warn(`❌ Strategy ${attempt + 1} failed:`, { error: lastError, attempt: attempt + 1 });
        }
      }
    }

    // Final fallback
    if (fallbackValue !== undefined) {
      if (logging) {
        logger.warn("🔄 Using fallback value due to parsing failure");
      }
      return {
        success: true,
        data: fallbackValue,
        method: "fallback",
        originalContent: content,
      };
    }

    return {
      success: false,
      error: `All parsing strategies failed. Last error: ${lastError}`,
      originalContent: content,
    };
  }

  /**
   * Strategy 1: Direct JSON parsing
   */
  private static parseDirectJSON<T>(content: string): ParseResult<T> {
    try {
      const trimmed = content.trim();
      const parsed = safeParse(trimmed);
      return {
        success: true,
        data: parsed,
        method: "direct",
      };
    } catch (error) {
      return {
        success: false,
        error: `Direct JSON parse failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        method: "direct",
      };
    }
  }

  /**
   * Strategy 2: Extract from markdown code blocks
   */
  private static parseFromMarkdownBlocks<T>(content: string): ParseResult<T> {
    try {
      // Reset regex lastIndex to ensure fresh search
      this.JSON_BLOCK_REGEX.lastIndex = 0;
      const matches = Array.from(content.matchAll(this.JSON_BLOCK_REGEX));

      if (matches.length === 0) {
        return {
          success: false,
          error: "No markdown code blocks found",
          method: "markdown",
        };
      }

      // Try each code block
      for (const match of matches) {
        const jsonContent = match[1]?.trim();
        if (jsonContent) {
          try {
            const parsed = safeParse(jsonContent);
            return {
              success: true,
              data: parsed,
              method: "markdown",
            };
          } catch (error) {
            continue; // Try next block
          }
        }
      }

      return {
        success: false,
        error: "Found code blocks but none contained valid JSON",
        method: "markdown",
      };
    } catch (error) {
      return {
        success: false,
        error: `Markdown extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        method: "markdown",
      };
    }
  }

  /**
   * Strategy 3: Extract JSON objects/arrays from mixed content
   */
  private static extractAndParseJSON<T>(content: string): ParseResult<T> {
    try {
      // Try to find JSON object
      const objectMatch = content.match(this.JSON_OBJECT_REGEX);
      if (objectMatch) {
        try {
          const parsed = safeParse(objectMatch[0]);
          return {
            success: true,
            data: parsed,
            method: "extraction-object",
          };
        } catch (error) {
          // Continue to array extraction
        }
      }

      // Try to find JSON array
      const arrayMatch = content.match(this.JSON_ARRAY_REGEX);
      if (arrayMatch) {
        try {
          const parsed = safeParse(arrayMatch[0]);
          return {
            success: true,
            data: parsed,
            method: "extraction-array",
          };
        } catch (error) {
          // Continue to next strategy
        }
      }

      return {
        success: false,
        error: "No valid JSON objects or arrays found in content",
        method: "extraction",
      };
    } catch (error) {
      return {
        success: false,
        error: `JSON extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        method: "extraction",
      };
    }
  }

  /**
   * Strategy 4: Clean common issues and parse
   */
  private static parseWithCleaning<T>(content: string): ParseResult<T> {
    try {
      let cleaned = content.trim();

      // Remove common prefixes/suffixes
      cleaned = cleaned.replace(/^[^{[]*([{[])/, "$1");
      cleaned = cleaned.replace(/([}\]])[^}\]]*$/, "$1");

      // Fix common JSON issues
      cleaned = this.fixCommonJSONIssues(cleaned);

      const parsed = JSON.parse(cleaned);
      return {
        success: true,
        data: parsed,
        method: "cleaned",
      };
    } catch (error) {
      return {
        success: false,
        error: `Cleaning strategy failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        method: "cleaned",
      };
    }
  }

  /**
   * Strategy 5: Attempt basic JSON repairs
   */
  private static parseWithRepairs<T>(content: string): ParseResult<T> {
    try {
      let repaired = content.trim();

      // Extract potential JSON from content
      const jsonMatch = repaired.match(/[{[][\s\S]*[}\]]/);
      if (jsonMatch) {
        repaired = jsonMatch[0];
      }

      // Apply repairs
      repaired = this.repairJSON(repaired);

      const parsed = JSON.parse(repaired);
      return {
        success: true,
        data: parsed,
        method: "repaired",
      };
    } catch (error) {
      return {
        success: false,
        error: `Repair strategy failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        method: "repaired",
      };
    }
  }

  /**
   * Strategy 6: Aggressive cleaning (only in non-strict mode)
   */
  private static parseWithAggressiveCleaning<T>(
    content: string,
  ): ParseResult<T> {
    try {
      let aggressive = content.trim();

      // Remove all non-JSON characters before first { or [
      aggressive = aggressive.replace(/^[^{[]*/, "");
      // Remove all non-JSON characters after last } or ]
      aggressive = aggressive.replace(/[^}\]]*$/, "");

      // Apply all fixes
      aggressive = this.fixCommonJSONIssues(aggressive);
      aggressive = this.repairJSON(aggressive);

      const parsed = safeParse(aggressive);
      return {
        success: true,
        data: parsed,
        method: "aggressive",
      };
    } catch (error) {
      return {
        success: false,
        error: `Aggressive cleaning failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        method: "aggressive",
      };
    }
  }

  /**
   * Fix common JSON formatting issues
   */
  private static fixCommonJSONIssues(json: string): string {
    let fixed = json;

    // Remove trailing commas
    fixed = fixed.replace(/,(\s*[}\]])/g, "$1");

    // Fix single quotes to double quotes (basic case)
    fixed = fixed.replace(/'([^']*)':/g, '"$1":');
    fixed = fixed.replace(/:(\s*)'([^']*)'/g, ': "$2"');

    // Remove comments (basic /* */ and // styles)
    fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, "");
    fixed = fixed.replace(/\/\/.*$/gm, "");

    // Fix common escape sequences
    fixed = fixed.replace(/\n/g, "\\n");
    fixed = fixed.replace(/\r/g, "\\r");
    fixed = fixed.replace(/\t/g, "\\t");

    return fixed;
  }

  /**
   * Attempt basic JSON structure repairs
   */
  private static repairJSON(json: string): string {
    let repaired = json;

    // Ensure proper brackets
    const openBraces = (repaired.match(/\{/g) || []).length;
    const closeBraces = (repaired.match(/\}/g) || []).length;
    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/\]/g) || []).length;

    // Add missing closing braces
    if (openBraces > closeBraces) {
      repaired += "}".repeat(openBraces - closeBraces);
    }

    // Add missing closing brackets
    if (openBrackets > closeBrackets) {
      repaired += "]".repeat(openBrackets - closeBrackets);
    }

    return repaired;
  }

  /**
   * Validate JSON structure after parsing
   */
  static validateStructure(data: any, expectedKeys?: string[]): boolean {
    if (!data || typeof data !== "object") {
      return false;
    }

    if (expectedKeys) {
      return expectedKeys.every((key) => key in data);
    }

    return true;
  }

  /**
   * Convenience method for parsing with type safety
   */
  static parseWithSchema<T>(
    content: string,
    validator: (data: any) => data is T,
    options: JSONParserOptions = {},
  ): ParseResult<T> {
    const result = this.parse<T>(content, options);

    if (result.success && result.data) {
      if (validator(result.data)) {
        return result;
      } else {
        return {
          success: false,
          error: "Parsed data does not match expected schema",
          originalContent: content,
        };
      }
    }

    return result;
  }
}

/**
 * Convenience function for simple JSON parsing with fallback
 */
export function parseJSON<T = any>(
  content: string,
  fallbackValue?: T,
  options: JSONParserOptions = {},
): T | null {
  const result = RobustJSONParser.parse<T>(content, {
    ...options,
    fallbackValue,
  });

  return result.success ? result.data! : null;
}

/**
 * Convenience function for parsing with expected keys validation
 */
export function parseJSONWithKeys<T = any>(
  content: string,
  expectedKeys: string[],
  fallbackValue?: T,
): T | null {
  const result = RobustJSONParser.parse<T>(content, { fallbackValue });

  if (result.success && result.data) {
    const isValid = RobustJSONParser.validateStructure(
      result.data,
      expectedKeys,
    );
    return isValid ? result.data : fallbackValue || null;
  }

  return fallbackValue || null;
}

/**
 * Safe JSON parsing function with fallback
 */
export function safeJsonParse<T = any>(
  content: string,
  fallbackValue?: T,
  options?: { logging?: boolean }
): T | null {
  const result = RobustJSONParser.parse<T>(content, {
    fallbackValue,
    logging: options?.logging ?? false
  });
  
  return result.success ? result.data! : (fallbackValue ?? null);
}

/**
 * Validate JSON structure against expected keys
 */
export function validateJsonStructure(
  data: any,
  expectedKeys?: string[]
): boolean {
  return RobustJSONParser.validateStructure(data, expectedKeys);
}
