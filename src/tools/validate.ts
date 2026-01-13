import { validateAgainstSchema } from '../validators/schema.js';
import { checkNamingConventions } from '../validators/naming.js';
import { validateTealiumRules } from '../validators/tealium-rules.js';
import type { ValidationResult, TealiumDataLayer } from '../types/index.js';

export interface ValidateDataLayerArgs {
  dataLayer: unknown;
  schemaUri?: string;
  strictMode?: boolean;
}

export function validateDataLayer(args: ValidateDataLayerArgs): ValidationResult {
  const { dataLayer, schemaUri = 'tealium://schema/standard', strictMode = false } = args;

  // Validate against JSON schema
  const schemaResult = validateAgainstSchema(dataLayer, schemaUri);

  // Run Tealium-specific rules
  const tealiumResult = validateTealiumRules(dataLayer as TealiumDataLayer);

  // Check naming conventions
  const namingWarnings = typeof dataLayer === 'object' && dataLayer !== null
    ? checkNamingConventions(dataLayer as Record<string, unknown>)
    : [];

  // Combine results
  const allErrors = [...schemaResult.errors, ...tealiumResult.errors];
  const allWarnings = [...schemaResult.warnings, ...tealiumResult.warnings, ...namingWarnings];
  const allSuggestions = [...schemaResult.suggestions, ...tealiumResult.suggestions];

  // In strict mode, treat warnings as errors
  if (strictMode) {
    for (const warning of allWarnings) {
      allErrors.push({
        path: warning.path,
        message: warning.message,
        expected: warning.suggestion,
      });
    }
  }

  // Build summary
  const isValid = allErrors.length === 0;
  let summary = '';

  if (isValid && allWarnings.length === 0) {
    summary = 'Data layer is valid with no warnings';
  } else if (isValid) {
    summary = `Data layer is valid with ${allWarnings.length} warning(s)`;
  } else {
    summary = `Found ${allErrors.length} error(s) and ${allWarnings.length} warning(s)`;
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
      if (error.expected) {
        lines.push(`  - Expected: ${error.expected}`);
      }
    }
    lines.push('');
  }

  if (result.warnings.length > 0) {
    lines.push('### Warnings');
    for (const warning of result.warnings) {
      lines.push(`- **${warning.path}**: ${warning.message}`);
      if (warning.suggestion) {
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
