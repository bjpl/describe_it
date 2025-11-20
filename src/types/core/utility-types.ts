/**
 * Core utility types for the application
 */

import type { JsonValue } from './json-types';

/**
 * Function types for callbacks and event handlers
 */
export type VoidFunction = () => void;
export type AsyncVoidFunction = () => Promise<void>;
export type GenericCallback<T = unknown> = (data: T) => void;
export type AsyncCallback<T = unknown> = (data: T) => Promise<void>;
export type ErrorCallback = (error: Error) => void;
export type EventHandler<T = Event> = (event: T) => void;
export type AsyncEventHandler<T = Event> = (event: T) => Promise<void>;

/**
 * Configuration and options types
 */
export type ConfigurationValue = string | number | boolean | null | undefined;
export type ConfigurationOptions = Record<string, ConfigurationValue>;
export type FeatureFlags = Record<string, boolean>;
export type EnvironmentVariables = Record<string, string>;

/**
 * Utility types for type transformations
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object | undefined ? DeepRequired<NonNullable<T[P]>> : T[P];
};

export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];
