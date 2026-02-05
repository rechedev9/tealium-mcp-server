import type { TealiumDataLayer, DebugIssue, TypeMismatch } from './types.js';
import { isRecord } from '../../types/index.js';

export function checkEmptyValues(obj: unknown, path: string, issues: DebugIssue[]): void {
  if (isRecord(obj)) {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path !== '' ? `${path}.${key}` : key;

      if (value === '') {
        issues.push({
          severity: 'warning',
          path: currentPath,
          issue: 'Empty string value',
          recommendation: 'Remove the property or set a meaningful value',
        });
      } else if (value === null) {
        issues.push({
          severity: 'info',
          path: currentPath,
          issue: 'Null value',
          recommendation: 'Consider if this property should be present at all',
        });
      } else if (Array.isArray(value) && value.length === 0) {
        issues.push({
          severity: 'info',
          path: currentPath,
          issue: 'Empty array',
          recommendation: 'Remove empty arrays unless intentionally indicating "no items"',
        });
      } else if (isRecord(value)) {
        checkEmptyValues(value, currentPath, issues);
      }
    }
  }
}

export function checkDataTypes(obj: unknown, path: string, mismatches: TypeMismatch[]): void {
  const expectedTypes: Record<string, string> = {
    'page.pageName': 'string',
    'page.language': 'string',
    'user.isLoggedIn': 'boolean',
    'user.userId': 'string',
    'product.productPrice': 'number',
    'product.productQuantity': 'number',
    'transaction.transactionTotal': 'number',
    'transaction.transactionTax': 'number',
    'booking.bookingTotal': 'number',
    'booking.bookingNights': 'number',
    'booking.bookingAdults': 'number',
    'booking.bookingRooms': 'number',
    'hotel.hotelStarRating': 'number',
    'search.searchAdults': 'number',
    'search.searchRooms': 'number',
    'guest.guestLoyaltyPoints': 'number',
  };

  if (isRecord(obj)) {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path !== '' ? `${path}.${key}` : key;

      const expectedType = expectedTypes[currentPath];
      if (expectedType !== undefined) {
        const actualType = typeof value;

        if (actualType !== expectedType && value !== null && value !== undefined) {
          mismatches.push({
            path: currentPath,
            expected: expectedType,
            actual: actualType,
          });
        }
      }

      if (isRecord(value)) {
        checkDataTypes(value, currentPath, mismatches);
      }
    }
  }
}

export function checkCommonMissingVariables(dataLayer: TealiumDataLayer, missing: string[]): void {
  // Check page data
  if (dataLayer.page === undefined) {
    missing.push('page (entire object)');
  } else {
    // pageName is required in PageData type, but check for empty string
    if (dataLayer.page.pageName === '') {
      missing.push('page.pageName');
    }
    if (dataLayer.page.pageType === undefined) {
      missing.push('page.pageType');
    }
  }

  // Check user data
  if (dataLayer.user === undefined) {
    missing.push('user (entire object)');
  } else {
    // Both are optional, so check for both missing
    const hasVisitorId = dataLayer.user.visitorId !== undefined;
    const hasUserId = dataLayer.user.userId !== undefined;
    if (!hasVisitorId && !hasUserId) {
      missing.push('user.visitorId or user.userId');
    }
  }

  // Check hotel-specific if booking exists
  if (dataLayer.booking !== undefined) {
    const hotelCode = dataLayer.hotel?.hotelCode;
    if (hotelCode === undefined) {
      missing.push('hotel.hotelCode');
    }
    // bookingCurrency is required in BookingData, check for empty
    if (dataLayer.booking.bookingCurrency === '') {
      missing.push('booking.bookingCurrency');
    }
  }

  // Check search-specific
  if (dataLayer.search !== undefined) {
    const hasSearchDest = dataLayer.search.searchDestination !== undefined;
    const hasHotel = dataLayer.hotel !== undefined;
    if (!hasSearchDest && !hasHotel) {
      missing.push('search.searchDestination or hotel context');
    }
  }
}

export function checkEventTracking(
  dataLayer: TealiumDataLayer,
  issues: DebugIssue[],
  recommendations: string[]
): void {
  if (dataLayer.event !== undefined) {
    // eventName is required in EventData
    const name = dataLayer.event.eventName;

    // Check for spaces (common mistake)
    if (name.includes(' ')) {
      issues.push({
        severity: 'warning',
        path: 'event.eventName',
        issue: `Event name contains spaces: "${name}"`,
        recommendation:
          'Use snake_case or dot.notation (e.g., "booking_completed" or "booking.completed")',
      });
    }

    // Check for capitalization
    if (name !== name.toLowerCase()) {
      issues.push({
        severity: 'info',
        path: 'event.eventName',
        issue: 'Event name contains uppercase characters',
        recommendation: 'Consider using lowercase for consistency',
      });
    }

    // Check for missing event category
    if (dataLayer.event.eventCategory === undefined) {
      recommendations.push('Add eventCategory for better event organization in reports');
    }
  }
}

export function checkBookingFunnel(
  dataLayer: TealiumDataLayer,
  issues: DebugIssue[],
  _recommendations: string[]
): void {
  // Check booking data consistency
  if (dataLayer.booking !== undefined) {
    const booking = dataLayer.booking;

    // Check if hotel data is present - bookingId is optional
    if (dataLayer.hotel === undefined && booking.bookingId !== undefined) {
      issues.push({
        severity: 'error',
        path: 'hotel',
        issue: 'Booking exists but hotel data is missing',
        recommendation: 'Include hotel.hotelCode and hotel.hotelName with booking data',
      });
    }

    // Check dates - these are required fields in BookingData
    const checkIn = new Date(booking.bookingCheckIn);
    const checkOut = new Date(booking.bookingCheckOut);
    const now = new Date();

    if (checkIn < now && booking.bookingStatus !== 'completed') {
      issues.push({
        severity: 'warning',
        path: 'booking.bookingCheckIn',
        issue: 'Check-in date is in the past',
        recommendation: 'Verify date is correct or update booking status',
      });
    }

    if (checkOut < checkIn) {
      issues.push({
        severity: 'error',
        path: 'booking.bookingCheckOut',
        issue: 'Check-out date is before check-in date',
        recommendation: 'Fix date values',
      });
    }

    // Check totals
    if (booking.bookingTotal === 0) {
      issues.push({
        severity: 'warning',
        path: 'booking.bookingTotal',
        issue: 'Booking total is zero',
        recommendation: 'Verify pricing data is correctly populated',
      });
    }
  }
}

export function checkSpecificArea(
  dataLayer: TealiumDataLayer,
  checkpoint: string,
  issues: DebugIssue[],
  _recommendations: string[]
): void {
  switch (checkpoint.toLowerCase()) {
    case 'ecommerce':
    case 'products':
      if (dataLayer.products !== undefined) {
        for (let i = 0; i < dataLayer.products.length; i++) {
          const product = dataLayer.products[i];
          // productId is required in ProductData, so if product exists, it has productId
          // This check is for documentation and defensive coding
          if (product?.productId === '') {
            issues.push({
              severity: 'error',
              path: `products[${String(i)}].productId`,
              issue: 'Product has empty productId',
              recommendation: 'Every product must have a unique identifier',
            });
          }
        }
      }
      break;

    case 'loyalty':
    case 'guest':
      if (dataLayer.guest === undefined && dataLayer.user?.userType === 'loyalty') {
        issues.push({
          severity: 'warning',
          path: 'guest',
          issue: 'User is loyalty member but guest data is missing',
          recommendation: 'Include guest.guestLoyaltyTier and guest.guestLoyaltyPoints',
        });
      }
      break;

    case 'search':
      if (dataLayer.search !== undefined && dataLayer.search.searchCheckIn === undefined) {
        _recommendations.push(
          'Include check-in and check-out dates in search data for better analysis'
        );
      }
      break;
  }
}

export function generateRecommendations(
  dataLayer: TealiumDataLayer,
  issues: readonly DebugIssue[],
  recommendations: string[]
): void {
  const CRITICAL_ERROR_THRESHOLD = 5;
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  if (errorCount > CRITICAL_ERROR_THRESHOLD) {
    recommendations.push(
      'Consider reviewing your data layer implementation - multiple critical issues detected'
    );
  }

  // Missing core data
  if (dataLayer.page?.pageType === undefined) {
    recommendations.push('Add page.pageType for better page classification in analytics');
  }

  // Currency consistency
  if (dataLayer.booking?.bookingCurrency !== undefined && dataLayer.page?.currency !== undefined) {
    if (dataLayer.booking.bookingCurrency !== dataLayer.page.currency) {
      recommendations.push('Ensure page.currency and booking.bookingCurrency are consistent');
    }
  }
}
