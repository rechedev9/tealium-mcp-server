import { validateAgainstSchema } from '../validators/schema.js';
import { checkNamingConventions } from '../validators/naming.js';
import { validateTealiumRules } from '../validators/tealium-rules.js';
import type { ValidationResult, ValidationError, ValidationWarning } from '../types/index.js';
import { isRecord, isTealiumDataLayer } from '../types/index.js';

export interface ValidateDataLayerArgs {
  readonly dataLayer: unknown;
  readonly schemaUri?: string;
  readonly strictMode?: boolean;
}

export function validateDataLayer(args: ValidateDataLayerArgs): ValidationResult {
  const { dataLayer, schemaUri = 'tealium://schema/standard', strictMode = false } = args;

  // Validate that dataLayer is an object first
  if (!isRecord(dataLayer)) {
    return {
      isValid: false,
      errors: [
        {
          path: '/',
          message: 'Data layer must be an object',
          value: dataLayer,
          expected: 'object',
        },
      ],
      warnings: [],
      suggestions: ['Provide a valid data layer object'],
      summary: 'Invalid data layer: not an object',
    };
  }

  // Validate against JSON schema
  const schemaResult = validateAgainstSchema(dataLayer, schemaUri);

  // Run Tealium-specific rules only if it looks like a valid data layer
  const tealiumResult = isTealiumDataLayer(dataLayer)
    ? validateTealiumRules(dataLayer)
    : { errors: [], warnings: [], suggestions: [] };

  // Check naming conventions
  const namingWarnings = checkNamingConventions(dataLayer);

  // Combine results
  const allErrors: ValidationError[] = [...schemaResult.errors, ...tealiumResult.errors];
  const allWarnings: ValidationWarning[] = [
    ...schemaResult.warnings,
    ...tealiumResult.warnings,
    ...namingWarnings,
  ];
  const allSuggestions: string[] = [...schemaResult.suggestions, ...tealiumResult.suggestions];

  // In strict mode, treat warnings as errors
  if (strictMode) {
    for (const warning of allWarnings) {
      const error: ValidationError =
        warning.suggestion !== undefined
          ? { path: warning.path, message: warning.message, expected: warning.suggestion }
          : { path: warning.path, message: warning.message };
      allErrors.push(error);
    }
  }

  // Build summary
  const isValid = allErrors.length === 0;
  let summary = '';

  if (isValid && allWarnings.length === 0) {
    summary = 'Data layer is valid with no warnings';
  } else if (isValid) {
    summary = `Data layer is valid with ${String(allWarnings.length)} warning(s)`;
  } else {
    summary = `Found ${String(allErrors.length)} error(s) and ${String(allWarnings.length)} warning(s)`;
  }

  return {
    isValid,
    errors: allErrors,
    warnings: strictMode ? [] : allWarnings,
    suggestions: allSuggestions,
    summary,
  };
}

export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [];

  lines.push(`## Validation Result: ${result.isValid ? '✅ VALID' : '❌ INVALID'}`);
  lines.push('');
  lines.push(result.summary);
  lines.push('');

  if (result.errors.length > 0) {
    lines.push('### Errors');
    for (const error of result.errors) {
      lines.push(`- **${error.path}**: ${error.message}`);
      if (error.expected !== undefined) {
        lines.push(`  - Expected: ${error.expected}`);
      }
    }
    lines.push('');
  }

  if (result.warnings.length > 0) {
    lines.push('### Warnings');
    for (const warning of result.warnings) {
      lines.push(`- **${warning.path}**: ${warning.message}`);
      if (warning.suggestion !== undefined) {
        lines.push(`  - Suggestion: ${warning.suggestion}`);
      }
    }
    lines.push('');
  }

  if (result.suggestions.length > 0) {
    lines.push('### Suggestions');
    for (const suggestion of result.suggestions) {
      lines.push(`- ${suggestion}`);
    }
  }

  return lines.join('\n');
}
