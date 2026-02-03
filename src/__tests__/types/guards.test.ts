import { describe, test, expect } from 'bun:test';
import {
  isRecord,
  isString,
  isNumber,
  isBoolean,
  isArray,
  isStringArray,
  isTealiumDataLayer,
  isTrackingSpec,
  isPageData,
  isEventData,
  isProductData,
} from '../../types/guards.js';

describe('Type Guards', () => {
  describe('isRecord', () => {
    test('returns true for plain objects', () => {
      expect(isRecord({})).toBe(true);
      expect(isRecord({ key: 'value' })).toBe(true);
    });

    test('returns false for non-objects', () => {
      expect(isRecord(null)).toBe(false);
      expect(isRecord(undefined)).toBe(false);
      expect(isRecord('string')).toBe(false);
      expect(isRecord(123)).toBe(false);
      expect(isRecord([])).toBe(false);
    });
  });

  describe('isString', () => {
    test('returns true for strings', () => {
      expect(isString('')).toBe(true);
      expect(isString('hello')).toBe(true);
    });

    test('returns false for non-strings', () => {
      expect(isString(123)).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
    });
  });

  describe('isNumber', () => {
    test('returns true for numbers', () => {
      expect(isNumber(0)).toBe(true);
      expect(isNumber(123)).toBe(true);
      expect(isNumber(-45.67)).toBe(true);
    });

    test('returns false for NaN', () => {
      expect(isNumber(NaN)).toBe(false);
    });

    test('returns false for non-numbers', () => {
      expect(isNumber('123')).toBe(false);
      expect(isNumber(null)).toBe(false);
    });
  });

  describe('isBoolean', () => {
    test('returns true for booleans', () => {
      expect(isBoolean(true)).toBe(true);
      expect(isBoolean(false)).toBe(true);
    });

    test('returns false for non-booleans', () => {
      expect(isBoolean(1)).toBe(false);
      expect(isBoolean('true')).toBe(false);
    });
  });

  describe('isArray', () => {
    test('returns true for arrays', () => {
      expect(isArray([])).toBe(true);
      expect(isArray([1, 2, 3])).toBe(true);
    });

    test('returns false for non-arrays', () => {
      expect(isArray({})).toBe(false);
      expect(isArray('array')).toBe(false);
    });
  });

  describe('isStringArray', () => {
    test('returns true for string arrays', () => {
      expect(isStringArray([])).toBe(true);
      expect(isStringArray(['a', 'b', 'c'])).toBe(true);
    });

    test('returns false for mixed arrays', () => {
      expect(isStringArray([1, 'a'])).toBe(false);
      expect(isStringArray([null])).toBe(false);
    });
  });

  describe('isPageData', () => {
    test('returns true for valid page data', () => {
      expect(isPageData({ pageName: 'Home' })).toBe(true);
      expect(isPageData({ pageName: 'Products', pageType: 'category' })).toBe(true);
    });

    test('returns false for invalid page data', () => {
      expect(isPageData({})).toBe(false);
      expect(isPageData({ pageType: 'home' })).toBe(false);
      expect(isPageData(null)).toBe(false);
    });
  });

  describe('isEventData', () => {
    test('returns true for valid event data', () => {
      expect(isEventData({ eventName: 'click' })).toBe(true);
      expect(isEventData({ eventName: 'purchase', eventCategory: 'ecommerce' })).toBe(true);
    });

    test('returns false for invalid event data', () => {
      expect(isEventData({})).toBe(false);
      expect(isEventData({ eventCategory: 'test' })).toBe(false);
    });
  });

  describe('isProductData', () => {
    test('returns true for valid product data', () => {
      expect(isProductData({ productId: 'SKU123', productName: 'Widget' })).toBe(true);
    });

    test('returns false for invalid product data', () => {
      expect(isProductData({ productId: 'SKU123' })).toBe(false);
      expect(isProductData({ productName: 'Widget' })).toBe(false);
      expect(isProductData({})).toBe(false);
    });
  });

  describe('isTealiumDataLayer', () => {
    test('returns true for valid data layers', () => {
      expect(isTealiumDataLayer({})).toBe(true);
      expect(isTealiumDataLayer({ page: { pageName: 'Home' } })).toBe(true);
      expect(
        isTealiumDataLayer({
          page: { pageName: 'Home' },
          user: { userId: 'user123' },
        })
      ).toBe(true);
    });

    test('returns false for invalid data layers', () => {
      expect(isTealiumDataLayer(null)).toBe(false);
      expect(isTealiumDataLayer('string')).toBe(false);
      expect(isTealiumDataLayer({ page: 'invalid' })).toBe(false);
    });
  });

  describe('isTrackingSpec', () => {
    test('returns true for valid tracking specs', () => {
      expect(
        isTrackingSpec({
          name: 'Test Spec',
          variables: [],
          events: [],
        })
      ).toBe(true);
    });

    test('returns false for invalid tracking specs', () => {
      expect(isTrackingSpec({})).toBe(false);
      expect(isTrackingSpec({ name: 'Test' })).toBe(false);
      expect(isTrackingSpec({ name: 'Test', variables: [] })).toBe(false);
    });
  });
});
