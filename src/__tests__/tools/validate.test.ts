import { describe, test, expect } from 'bun:test';
import { validateDataLayer, formatValidationResult } from '../../tools/validate.js';

describe('validateDataLayer', () => {
  describe('basic validation', () => {
    test('returns invalid for non-object input', () => {
      const result = validateDataLayer({ dataLayer: 'not an object' });
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('returns invalid for null input', () => {
      const result = validateDataLayer({ dataLayer: null });
      expect(result.isValid).toBe(false);
    });

    test('validates empty object', () => {
      const result = validateDataLayer({ dataLayer: {} });
      // Empty object fails because page.pageName is required
      expect(result.isValid).toBe(false);
    });

    test('validates valid data layer with page', () => {
      const result = validateDataLayer({
        dataLayer: {
          page: { pageName: 'Home', pageType: 'homepage' },
        },
      });
      expect(result.isValid).toBe(true);
    });
  });

  describe('schema validation', () => {
    test('validates against standard schema', () => {
      const result = validateDataLayer({
        dataLayer: {
          page: { pageName: 'Home' },
        },
        schemaUri: 'tealium://schema/standard',
      });
      expect(result.isValid).toBe(true);
    });

    test('returns error for unknown schema', () => {
      const result = validateDataLayer({
        dataLayer: { page: { pageName: 'Home' } },
        schemaUri: 'tealium://schema/unknown',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('Schema not found'))).toBe(true);
    });
  });

  describe('strict mode', () => {
    test('treats warnings as errors in strict mode', () => {
      const result = validateDataLayer({
        dataLayer: {
          page: { pageName: 'Home', currency: 'usd' }, // lowercase currency
        },
        strictMode: true,
      });
      // In strict mode, the currency warning becomes an error
      expect(result.warnings.length).toBe(0);
    });
  });

  describe('Tealium-specific rules', () => {
    test('detects undefined string values', () => {
      const result = validateDataLayer({
        dataLayer: {
          page: { pageName: 'undefined' },
        },
      });
      expect(result.errors.some((e) => e.message.includes('stringified'))).toBe(true);
    });

    test('validates currency format', () => {
      const result = validateDataLayer({
        dataLayer: {
          page: { pageName: 'Home', currency: 'USD' },
        },
      });
      expect(result.warnings.filter((w) => w.path === 'page.currency').length).toBe(0);
    });

    test('warns on invalid currency format', () => {
      const result = validateDataLayer({
        dataLayer: {
          page: { pageName: 'Home', currency: 'dollars' },
        },
      });
      expect(result.warnings.some((w) => w.path === 'page.currency')).toBe(true);
    });
  });
});

describe('formatValidationResult', () => {
  test('formats valid result', () => {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      summary: 'Data layer is valid',
    };
    const formatted = formatValidationResult(result);
    expect(formatted).toContain('✅ VALID');
    expect(formatted).toContain('Data layer is valid');
  });

  test('formats invalid result with errors', () => {
    const result = {
      isValid: false,
      errors: [{ path: 'page.pageName', message: 'Required field missing' }],
      warnings: [],
      suggestions: [],
      summary: 'Found 1 error(s)',
    };
    const formatted = formatValidationResult(result);
    expect(formatted).toContain('❌ INVALID');
    expect(formatted).toContain('page.pageName');
    expect(formatted).toContain('Required field missing');
  });

  test('formats warnings', () => {
    const result = {
      isValid: true,
      errors: [],
      warnings: [{ path: 'page.currency', message: 'Invalid format', suggestion: 'Use USD' }],
      suggestions: [],
      summary: 'Valid with warnings',
    };
    const formatted = formatValidationResult(result);
    expect(formatted).toContain('Warnings');
    expect(formatted).toContain('page.currency');
    expect(formatted).toContain('Use USD');
  });
});
