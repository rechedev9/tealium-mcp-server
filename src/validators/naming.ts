import type { ValidationWarning } from '../types/index.js';
import { isRecord } from '../types/index.js';

// Check if a string is camelCase
function isCamelCase(str: string): boolean {
  return /^[a-z][a-zA-Z0-9]*$/.test(str);
}

// Known prefixes for data layer sections
const KNOWN_PREFIXES: readonly string[] = [
  'page',
  'user',
  'event',
  'product',
  'transaction',
  'search',
  'hotel',
  'room',
  'booking',
  'guest',
];

// Reserved words that shouldn't be used as variable names
const RESERVED_WORDS: readonly string[] = [
  'undefined',
  'null',
  'true',
  'false',
  'function',
  'object',
];

export function checkNamingConventions(
  dataLayer: Record<string, unknown>,
  path = ''
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  for (const [key, value] of Object.entries(dataLayer)) {
    const currentPath = path !== '' ? `${path}.${key}` : key;

    // Check for non-camelCase keys
    if (!isCamelCase(key) && !KNOWN_PREFIXES.includes(key)) {
      warnings.push({
        path: currentPath,
        message: `Variable name "${key}" is not in camelCase`,
        suggestion: `Consider renaming to "${toCamelCase(key)}"`,
      });
    }

    // Check for reserved words
    if (RESERVED_WORDS.includes(key.toLowerCase())) {
      warnings.push({
        path: currentPath,
        message: `"${key}" is a reserved word and should not be used as a variable name`,
        suggestion: 'Use a more descriptive name',
      });
    }

    // Check for single-character names
    if (key.length === 1) {
      warnings.push({
        path: currentPath,
        message: `Variable name "${key}" is too short`,
        suggestion: 'Use a more descriptive name',
      });
    }

    // Check for abbreviations (all caps or very short words)
    if (key.length <= 3 && key === key.toUpperCase() && key !== 'id') {
      warnings.push({
        path: currentPath,
        message: `Variable name "${key}" appears to be an abbreviation`,
        suggestion: 'Use full words for better clarity',
      });
    }

    // Recursively check nested objects
    if (isRecord(value)) {
      warnings.push(...checkNamingConventions(value, currentPath));
    }
  }

  return warnings;
}

function toCamelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c: string | undefined) => (c !== undefined ? c.toUpperCase() : ''))
    .replace(/^(.)/, (c) => c.toLowerCase());
}

export function suggestVariableName(input: string): string {
  // Remove special characters and convert to camelCase
  const result = input
    .trim()
    .replace(/[^a-zA-Z0-9\s_-]/g, '')
    .replace(/[-_\s]+(.)?/g, (_, c: string | undefined) => (c !== undefined ? c.toUpperCase() : ''))
    .replace(/^(.)/, (c) => c.toLowerCase());

  return result;
}
