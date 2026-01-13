import type { ValidationError, ValidationWarning, TealiumDataLayer } from '../types/index.js';

interface TealiumValidationResult {
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

export function validateTealiumRules(dataLayer: TealiumDataLayer): TealiumValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];

  // Check for common Tealium-specific issues

  // 1. Check page.pageName exists and is not empty
  if (!dataLayer.page?.pageName) {
    errors.push({
      path: 'page.pageName',
      message: 'page.pageName is required and must not be empty',
      expected: 'non-empty string',
    });
  }

  // 2. Check for undefined values (common bug)
  checkForUndefinedValues(dataLayer, '', errors);

  // 3. Check for "undefined" or "null" strings (common bug)
  checkForStringifiedNulls(dataLayer, '', errors);

  // 4. Check currency format
  if (dataLayer.page?.currency) {
    if (!/^[A-Z]{3}$/.test(dataLayer.page.currency)) {
      warnings.push({
        path: 'page.currency',
        message: `Currency "${dataLayer.page.currency}" should be ISO 4217 format`,
        suggestion: 'Use 3-letter uppercase code like "USD", "EUR", "GBP"',
      });
    }
  }

  // 5. Check language format
  if (dataLayer.page?.language) {
    if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(dataLayer.page.language)) {
      warnings.push({
        path: 'page.language',
        message: `Language "${dataLayer.page.language}" should be ISO format`,
        suggestion: 'Use format like "en", "es", or "en-US", "es-ES"',
      });
    }
  }

  // 6. Check for PII exposure
  checkForPII(dataLayer, '', warnings);

  // 7. Check price values are numbers, not strings
  checkPriceValues(dataLayer, warnings);

  // 8. Hotel-specific validations
  if (dataLayer.booking) {
    validateBookingData(dataLayer.booking, errors, warnings);
  }

  if (dataLayer.hotel) {
    validateHotelData(dataLayer.hotel, errors, warnings);
  }

  // 9. Check date formats
  checkDateFormats(dataLayer, warnings);

  // Add suggestions based on what's missing
  if (!dataLayer.user?.visitorId && !dataLayer.user?.userId) {
    suggestions.push('Consider adding user.visitorId for anonymous tracking');
  }

  if (dataLayer.event && !dataLayer.event.eventCategory) {
    suggestions.push('Adding eventCategory helps with event organization in reports');
  }

  return { errors, warnings, suggestions };
}

function checkForUndefinedValues(
  obj: unknown,
  path: string,
  errors: ValidationError[]
): void {
  if (obj === undefined) {
    errors.push({
      path: path || '/',
      message: 'Value is undefined - this may cause tracking issues',
      value: undefined,
    });
    return;
  }

  if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      if (value === undefined) {
        errors.push({
          path: currentPath,
          message: 'Value is undefined - remove or set to null',
          value: undefined,
        });
      } else if (typeof value === 'object' && value !== null) {
        checkForUndefinedValues(value, currentPath, errors);
      }
    }
  }
}

function checkForStringifiedNulls(
  obj: unknown,
  path: string,
  errors: ValidationError[]
): void {
  if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      if (typeof value === 'string') {
        const lower = value.toLowerCase();
        if (lower === 'undefined' || lower === 'null' || lower === 'nan') {
          errors.push({
            path: currentPath,
            message: `String value "${value}" looks like a stringified null/undefined`,
            value,
            expected: 'Use actual null or remove the property',
          });
        }
      } else if (typeof value === 'object' && value !== null) {
        checkForStringifiedNulls(value, currentPath, errors);
      }
    }
  }
}

function checkForPII(
  obj: unknown,
  path: string,
  warnings: ValidationWarning[]
): void {
  const piiPatterns = [
    { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, name: 'email address' },
    { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, name: 'phone number' },
    { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, name: 'credit card number' },
  ];

  if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      // Skip known safe fields
      if (['userId', 'visitorId', 'bookingId', 'transactionId'].includes(key)) {
        continue;
      }

      if (typeof value === 'string') {
        for (const { pattern, name } of piiPatterns) {
          if (pattern.test(value)) {
            warnings.push({
              path: currentPath,
              message: `Possible ${name} detected in data layer`,
              suggestion: 'Ensure PII is properly hashed or removed before tracking',
            });
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        checkForPII(value, currentPath, warnings);
      }
    }
  }
}

function checkPriceValues(
  dataLayer: TealiumDataLayer,
  warnings: ValidationWarning[]
): void {
  const priceFields = [
    { path: 'product.productPrice', value: dataLayer.product?.productPrice },
    { path: 'transaction.transactionTotal', value: dataLayer.transaction?.transactionTotal },
    { path: 'booking.bookingTotal', value: dataLayer.booking?.bookingTotal },
    { path: 'booking.bookingTaxes', value: dataLayer.booking?.bookingTaxes },
    { path: 'booking.bookingFees', value: dataLayer.booking?.bookingFees },
  ];

  for (const { path, value } of priceFields) {
    if (value !== undefined && typeof value === 'string') {
      warnings.push({
        path,
        message: 'Price value is a string, should be a number',
        suggestion: `Convert "${value}" to number: ${parseFloat(value) || 0}`,
      });
    }
  }
}

function validateBookingData(
  booking: NonNullable<TealiumDataLayer['booking']>,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  // Check date logic
  if (booking.bookingCheckIn && booking.bookingCheckOut) {
    const checkIn = new Date(booking.bookingCheckIn);
    const checkOut = new Date(booking.bookingCheckOut);

    if (checkOut <= checkIn) {
      errors.push({
        path: 'booking.bookingCheckOut',
        message: 'Check-out date must be after check-in date',
        value: booking.bookingCheckOut,
      });
    }

    // Verify nights calculation
    if (booking.bookingNights) {
      const expectedNights = Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (booking.bookingNights !== expectedNights) {
        warnings.push({
          path: 'booking.bookingNights',
          message: `bookingNights (${booking.bookingNights}) doesn't match date range (${expectedNights} nights)`,
          suggestion: `Set bookingNights to ${expectedNights}`,
        });
      }
    }
  }

  // Check currency is set when total is present
  if (booking.bookingTotal && !booking.bookingCurrency) {
    errors.push({
      path: 'booking.bookingCurrency',
      message: 'bookingCurrency is required when bookingTotal is set',
      expected: '3-letter currency code (e.g., EUR, USD)',
    });
  }
}

function validateHotelData(
  hotel: NonNullable<TealiumDataLayer['hotel']>,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  // Star rating should be 1-5
  if (hotel.hotelStarRating !== undefined) {
    if (hotel.hotelStarRating < 1 || hotel.hotelStarRating > 5) {
      warnings.push({
        path: 'hotel.hotelStarRating',
        message: `Star rating ${hotel.hotelStarRating} is outside normal range (1-5)`,
        suggestion: 'Use a value between 1 and 5',
      });
    }
  }
}

function checkDateFormats(
  dataLayer: TealiumDataLayer,
  warnings: ValidationWarning[]
): void {
  const dateFields = [
    { path: 'search.searchCheckIn', value: dataLayer.search?.searchCheckIn },
    { path: 'search.searchCheckOut', value: dataLayer.search?.searchCheckOut },
    { path: 'booking.bookingCheckIn', value: dataLayer.booking?.bookingCheckIn },
    { path: 'booking.bookingCheckOut', value: dataLayer.booking?.bookingCheckOut },
  ];

  const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

  for (const { path, value } of dateFields) {
    if (value && typeof value === 'string' && !isoDatePattern.test(value)) {
      warnings.push({
        path,
        message: `Date "${value}" is not in ISO format`,
        suggestion: 'Use YYYY-MM-DD format (e.g., "2024-03-15")',
      });
    }
  }
}
