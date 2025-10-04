#!/usr/bin/env node
/**
 * Vocabulary Migration Script
 * Migrates vocabulary data from localStorage to Supabase database
 *
 * Usage:
 *   node scripts/migrate-vocabulary-to-db.js [--backup-file path/to/backup.json]
 *
 * Options:
 *   --backup-file   Path to localStorage backup JSON file
 *   --dry-run       Run without actually inserting data
 *   --batch-size    Number of items per batch (default: 100)
 *   --verbose       Enable verbose logging
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const config = {
  backupFile: null,
  dryRun: false,
  batchSize: 100,
  verbose: false,
};

// Parse command line arguments
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--backup-file':
      config.backupFile = args[++i];
      break;
    case '--dry-run':
      config.dryRun = true;
      break;
    case '--batch-size':
      config.batchSize = parseInt(args[++i], 10);
      break;
    case '--verbose':
      config.verbose = true;
      break;
    case '--help':
      console.log(`
Vocabulary Migration Script
Migrates vocabulary data from localStorage to Supabase database

Usage:
  node scripts/migrate-vocabulary-to-db.js [options]

Options:
  --backup-file FILE    Path to localStorage backup JSON file
  --dry-run            Run without actually inserting data
  --batch-size N       Number of items per batch (default: 100)
  --verbose            Enable verbose logging
  --help               Show this help message
      `);
      process.exit(0);
  }
}

// Logger utility
const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  debug: (msg) => config.verbose && console.log(`[DEBUG] ${msg}`),
  success: (msg) => console.log(`[SUCCESS] ${msg}`),
};

// Initialize Supabase client
function initSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials in environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
}

// Read backup file or localStorage data
async function readBackupData() {
  if (config.backupFile) {
    logger.info(`Reading backup from file: ${config.backupFile}`);
    const fileContent = await fs.readFile(config.backupFile, 'utf8');
    return JSON.parse(fileContent);
  }

  // Try to read from default backup location
  const defaultBackupPath = path.join(process.cwd(), 'backups', 'vocabulary-backup.json');
  try {
    logger.info(`Reading from default backup: ${defaultBackupPath}`);
    const fileContent = await fs.readFile(defaultBackupPath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    logger.error('No backup file found. Please export localStorage data first.');
    logger.info('Run in browser console: localStorage.getItem("vocabulary_items")');
    throw error;
  }
}

// Transform localStorage data to database format
function transformVocabularyItem(item, index) {
  logger.debug(`Transforming item ${index + 1}: ${item.word || item.spanish_text}`);

  // Auto-detect part of speech (simple heuristic)
  const detectPartOfSpeech = (word) => {
    if (!word) return 'other';

    const verbEndings = ['ar', 'er', 'ir'];
    const adjEndings = ['o', 'a', 'e'];

    if (verbEndings.some(ending => word.endsWith(ending))) return 'verb';
    if (adjEndings.some(ending => word.endsWith(ending)) && word.length > 4) return 'adjective';
    return 'noun';
  };

  // Calculate difficulty level based on word length and complexity
  const calculateDifficulty = (word) => {
    if (!word) return 1;

    const length = word.length;
    if (length <= 5) return 1;
    if (length <= 8) return 2;
    if (length <= 12) return 3;
    if (length <= 16) return 4;
    return 5;
  };

  // Assign frequency score (simplified - in production, use real frequency data)
  const calculateFrequency = (word) => {
    const commonWords = ['casa', 'perro', 'gato', 'agua', 'comer', 'hablar', 'ser', 'estar'];
    if (commonWords.includes(word?.toLowerCase())) return 95;
    return 50; // Default medium frequency
  };

  const spanishText = item.spanish_text || item.word || '';
  const englishTranslation = item.english_translation || item.translation || '';

  return {
    id: item.id || `migrated_${Date.now()}_${index}`,
    spanish_text: spanishText,
    english_translation: englishTranslation,
    category: item.category || 'general',
    difficulty_level: item.difficulty_level || calculateDifficulty(spanishText),
    part_of_speech: item.part_of_speech || detectPartOfSpeech(spanishText),
    frequency_score: item.frequency_score || calculateFrequency(spanishText),
    context_sentence_spanish: item.context_sentence_spanish || `Ejemplo con ${spanishText}.`,
    context_sentence_english: item.context_sentence_english || `Example with ${englishTranslation}.`,
    created_at: item.created_at || new Date().toISOString(),
  };
}

// Validate vocabulary item
function validateItem(item) {
  const errors = [];

  if (!item.spanish_text || item.spanish_text.trim().length === 0) {
    errors.push('spanish_text is required');
  }
  if (!item.english_translation || item.english_translation.trim().length === 0) {
    errors.push('english_translation is required');
  }
  if (item.spanish_text && item.spanish_text.length > 100) {
    errors.push('spanish_text exceeds 100 characters');
  }
  if (item.english_translation && item.english_translation.length > 200) {
    errors.push('english_translation exceeds 200 characters');
  }
  if (item.difficulty_level && (item.difficulty_level < 1 || item.difficulty_level > 5)) {
    errors.push('difficulty_level must be between 1 and 5');
  }
  if (item.frequency_score && (item.frequency_score < 0 || item.frequency_score > 100)) {
    errors.push('frequency_score must be between 0 and 100');
  }

  return errors;
}

// Insert items in batches
async function insertBatch(supabase, items) {
  if (config.dryRun) {
    logger.info(`[DRY RUN] Would insert ${items.length} items`);
    return { data: items, error: null };
  }

  const { data, error } = await supabase
    .from('vocabulary_items')
    .insert(items)
    .select();

  return { data, error };
}

// Main migration function
async function migrate() {
  logger.info('Starting vocabulary migration...');

  const startTime = Date.now();
  const migrationReport = {
    startTime: new Date().toISOString(),
    totalItems: 0,
    successfulItems: 0,
    failedItems: 0,
    skippedItems: 0,
    errors: [],
    warnings: [],
  };

  try {
    // Step 1: Initialize Supabase
    logger.info('Initializing Supabase client...');
    const supabase = initSupabase();

    // Step 2: Read backup data
    logger.info('Reading backup data...');
    const backupData = await readBackupData();

    let vocabularyItems = [];
    if (Array.isArray(backupData)) {
      vocabularyItems = backupData;
    } else if (backupData.vocabulary_items) {
      vocabularyItems = backupData.vocabulary_items;
    } else if (typeof backupData === 'string') {
      vocabularyItems = JSON.parse(backupData);
    }

    migrationReport.totalItems = vocabularyItems.length;
    logger.info(`Found ${vocabularyItems.length} vocabulary items to migrate`);

    // Step 3: Transform and validate data
    logger.info('Transforming and validating data...');
    const validItems = [];
    const invalidItems = [];

    for (let i = 0; i < vocabularyItems.length; i++) {
      const item = vocabularyItems[i];
      const transformed = transformVocabularyItem(item, i);
      const errors = validateItem(transformed);

      if (errors.length === 0) {
        validItems.push(transformed);
      } else {
        invalidItems.push({ item, errors });
        migrationReport.skippedItems++;
        migrationReport.errors.push({
          item: transformed,
          errors,
        });
      }

      // Progress reporting
      if ((i + 1) % 10 === 0 || i === vocabularyItems.length - 1) {
        const progress = ((i + 1) / vocabularyItems.length * 100).toFixed(1);
        logger.info(`Progress: ${progress}% (${i + 1}/${vocabularyItems.length})`);
      }
    }

    logger.info(`Valid items: ${validItems.length}, Invalid items: ${invalidItems.length}`);

    if (invalidItems.length > 0) {
      logger.warn(`Skipping ${invalidItems.length} invalid items`);
      invalidItems.slice(0, 5).forEach((item, idx) => {
        logger.warn(`  ${idx + 1}. ${item.item.spanish_text || 'Unknown'}: ${item.errors.join(', ')}`);
      });
    }

    // Step 4: Insert data in batches
    logger.info(`Inserting ${validItems.length} items in batches of ${config.batchSize}...`);

    for (let i = 0; i < validItems.length; i += config.batchSize) {
      const batch = validItems.slice(i, i + config.batchSize);
      const batchNum = Math.floor(i / config.batchSize) + 1;
      const totalBatches = Math.ceil(validItems.length / config.batchSize);

      logger.info(`Processing batch ${batchNum}/${totalBatches} (${batch.length} items)...`);

      const { data, error } = await insertBatch(supabase, batch);

      if (error) {
        logger.error(`Batch ${batchNum} failed: ${error.message}`);
        migrationReport.failedItems += batch.length;
        migrationReport.errors.push({
          batch: batchNum,
          error: error.message,
        });
      } else {
        migrationReport.successfulItems += batch.length;
        logger.success(`Batch ${batchNum} completed successfully`);
      }
    }

    // Step 5: Generate report
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    migrationReport.endTime = new Date().toISOString();
    migrationReport.durationSeconds = parseFloat(duration);
    migrationReport.successRate = (migrationReport.successfulItems / migrationReport.totalItems * 100).toFixed(2) + '%';

    // Save report to file
    const reportsDir = path.join(process.cwd(), 'logs');
    await fs.mkdir(reportsDir, { recursive: true });

    const reportPath = path.join(reportsDir, `migration-report-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(migrationReport, null, 2));

    // Display summary
    logger.success('\n=== Migration Complete ===');
    logger.info(`Total items: ${migrationReport.totalItems}`);
    logger.success(`Successful: ${migrationReport.successfulItems}`);
    logger.error(`Failed: ${migrationReport.failedItems}`);
    logger.warn(`Skipped: ${migrationReport.skippedItems}`);
    logger.info(`Duration: ${duration}s`);
    logger.info(`Success rate: ${migrationReport.successRate}`);
    logger.info(`Report saved to: ${reportPath}`);

    if (migrationReport.failedItems > 0 || migrationReport.skippedItems > 0) {
      logger.warn('\nPlease review the migration report for errors.');
      process.exit(1);
    }

  } catch (error) {
    logger.error(`Migration failed: ${error.message}`);
    logger.debug(error.stack);
    process.exit(1);
  }
}

// Run migration
migrate().catch((error) => {
  logger.error(`Unexpected error: ${error.message}`);
  process.exit(1);
});
