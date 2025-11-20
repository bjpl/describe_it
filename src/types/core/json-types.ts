/**
 * JSON-safe value types
 */

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray | undefined;
export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];

/**
 * Generic object types for unknown structures
 */
export type UnknownObject = Record<string, unknown>;
export type UnknownArray = unknown[];
export type StringRecord = Record<string, string>;
export type NumberRecord = Record<string, number>;
export type BooleanRecord = Record<string, boolean>;

/**
 * Safe alternative to `any` for third-party integrations
 * Use only when interfacing with untyped external libraries
 */
export type SafeAny = unknown;
