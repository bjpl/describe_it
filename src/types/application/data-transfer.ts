/**
 * Export and import types
 */

import type { JsonValue, UnknownObject } from '../core/json-types';
import type { DateRange, FilterOperator } from '../database/operations';
import type { ValidationRules } from '../components/props';
import type { ValidationError } from '../api/response-types';
import type { LanguageCode, DifficultyLevel } from './';

export type ExportFormat = 'json' | 'csv' | 'xml' | 'yaml' | 'txt' | 'pdf' | 'html' | 'anki' | 'quizlet';

export type ContentType =
  | 'vocabulary'
  | 'descriptions'
  | 'questions'
  | 'progress'
  | 'images'
  | 'sessions'
  | 'user_data';

export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired';

export type ImportStatus = 'pending' | 'validating' | 'processing' | 'completed' | 'failed' | 'rolled_back';

/**
 * Export and import types
 */
export interface ExportConfiguration {
  format: ExportFormat;
  content_types: ContentType[];
  filters: ExportFilters;
  formatting_options: FormattingOptions;
  metadata_options: MetadataOptions;
}

export interface ExportFilters {
  date_range?: DateRange;
  difficulty_levels?: DifficultyLevel[];
  categories?: string[];
  languages?: LanguageCode[];
  user_ids?: string[];
  tags?: string[];
  custom_filters?: CustomFilter[];
}

export interface CustomFilter {
  field: string;
  operator: FilterOperator['operator'];
  value: JsonValue;
  case_sensitive?: boolean;
}

export interface FormattingOptions {
  include_headers: boolean;
  delimiter?: string;
  encoding?: string;
  date_format?: string;
  number_format?: string;
  text_encoding?: 'utf8' | 'utf16' | 'ascii';
  compression?: 'none' | 'gzip' | 'zip';
}

export interface MetadataOptions {
  include_timestamps: boolean;
  include_user_info: boolean;
  include_system_info: boolean;
  include_version_info: boolean;
  include_export_info: boolean;
  custom_metadata?: UnknownObject;
}

export interface ExportResult {
  export_id: string;
  status: ExportStatus;
  file_info: ExportFileInfo;
  statistics: ExportStatistics;
  created_at: string;
  completed_at?: string;
  expires_at?: string;
  error_info?: ExportError;
}

export interface ExportFileInfo {
  filename: string;
  size_bytes: number;
  format: ExportFormat;
  content_type: string;
  checksum: string;
  download_url?: string;
  preview_url?: string;
}

export interface ExportStatistics {
  total_records: number;
  exported_records: number;
  filtered_records: number;
  error_records: number;
  processing_time: number;
  file_generation_time: number;
}

export interface ExportError {
  code: string;
  message: string;
  details?: UnknownObject;
  recoverable: boolean;
  retry_suggestion?: string;
}

/**
 * Import types
 */
export interface ImportConfiguration {
  source_format: ExportFormat;
  content_type: ContentType;
  mapping_rules: FieldMappingRule[];
  validation_rules: ImportValidationRule[];
  conflict_resolution: ConflictResolution;
  processing_options: ImportProcessingOptions;
}

export interface FieldMappingRule {
  source_field: string;
  target_field: string;
  transformation?: FieldTransformation;
  required: boolean;
  default_value?: JsonValue;
}

export interface FieldTransformation {
  type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  format?: string;
  pattern?: string;
  custom_function?: string;
}

export interface ImportValidationRule {
  field: string;
  rules: ValidationRules;
  error_handling: 'skip' | 'error' | 'warn' | 'default';
}

export interface ConflictResolution {
  strategy: 'skip' | 'update' | 'merge' | 'error';
  merge_strategy?: 'prefer_source' | 'prefer_target' | 'custom';
  custom_resolver?: string;
}

export interface ImportProcessingOptions {
  batch_size: number;
  parallel_processing: boolean;
  validate_before_import: boolean;
  create_backup: boolean;
  rollback_on_error: boolean;
  progress_reporting: boolean;
}

export interface ImportResult {
  import_id: string;
  status: ImportStatus;
  statistics: ImportStatistics;
  validation_results: ValidationResults;
  created_at: string;
  completed_at?: string;
  error_info?: ImportError;
}

export interface ImportStatistics {
  total_records: number;
  processed_records: number;
  created_records: number;
  updated_records: number;
  skipped_records: number;
  error_records: number;
  processing_time: number;
}

export interface ValidationResults {
  passed: number;
  failed: number;
  warnings: number;
  errors: ValidationError[];
  warnings_list: ValidationWarning[];
}

export interface ValidationWarning {
  field: string;
  message: string;
  value?: JsonValue;
  suggestion?: string;
}

export interface ImportError {
  code: string;
  message: string;
  details?: UnknownObject;
  affected_records?: number[];
  recovery_options?: string[];
}
