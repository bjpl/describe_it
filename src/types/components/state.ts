/**
 * Component state management types
 */

import type { JsonValue, UnknownObject } from '../core/json-types';
import type { FilterValue } from '../database/operations';
import React from 'react';

/**
 * State management types
 */
export interface ComponentState {
  [key: string]: JsonValue;
}

export interface LoadingState {
  isLoading: boolean;
  loadingMessage?: string;
  progress?: number;
  error?: string | null;
}

export interface PaginationState {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface SearchState {
  query: string;
  filters: SearchFilters;
  results: SearchResult[];
  totalResults: number;
  isSearching: boolean;
  suggestions: string[];
}

export interface SearchFilters {
  [key: string]: FilterValue;
}

export interface SearchResult {
  id: string;
  title: string;
  description?: string;
  url?: string;
  relevance: number;
  metadata: SearchResultMetadata;
}

export interface SearchResultMetadata {
  type: string;
  category?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  author?: string;
}

export interface ModalState {
  isOpen: boolean;
  content?: React.ReactNode;
  title?: string;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  closeOnOutsideClick?: boolean;
  closeOnEscape?: boolean;
}

export interface ToastState {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  autoClose?: boolean;
  actions?: ToastAction[];
}

export interface ToastAction {
  label: string;
  handler: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}
