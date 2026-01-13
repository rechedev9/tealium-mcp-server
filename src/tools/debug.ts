import type { TealiumDataLayer, DebugResult, DebugIssue } from '../types/index.js';

export interface DebugDataLayerArgs {
  dataLayer: TealiumDataLayer;
  expectedSchema?: string;
  checkPoints?: string[];
}

export function debugDataLayer(args: DebugDataLayerArgs): DebugResult {
  const { dataLayer, checkPoints = [] } = args;

  const issues: DebugIssue[] = [];
  const missingVariables: string[] = [];
  const typeMismatches: Array<{ path: string; expected: string; actual: string }> = [];
  const recommendations: string[] = [];

  // Check for common issues
  checkEmptyValues(dataLayer, '', issues);
  checkDataTypes(dataLayer, '', typeMismatches);
  checkCommonMissingVariables(dataLayer, missingVariables);
  checkEventTracking(dataLayer, issues, recommendations);
  checkBookingFunnel(dataLayer, issues, recommendations);

  // Process specific checkpoints if provided
  for (const checkpoint of checkPoints) {
    checkSpecificArea(dataLayer, checkpoint, issues, recommendations);
  }

  // Generate general recommendations
  generateRecommendations(dataLayer, issues, recommendations);

  return {
    dataLayerSnapshot: dataLayer,
    issues,
    missingVariables,
    typeMismatches,
    recommendations: [...new Set(recommendations)], // Remove duplicates
  };
}

function checkEmptyValues(
  obj: unknown,
  path: string,
  issues: DebugIssue[]
): void {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

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
      } else if (typeof value === 'object' && value !== null) {
        checkEmptyValues(value, currentPath, issues);
      }
    }
  }
}

function checkDataTypes(
  obj: unknown,
  path: string,
  mismatches: Array<{ path: string; expected: string; actual: string }>
): void {
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

  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (expectedTypes[currentPath]) {
        const expectedType = expectedTypes[currentPath];
        const actualType = typeof value;

        if (actualType !== expectedType && value !== null && value !== undefined) {
          mismatches.push({
            path: currentPath,
            expected: expectedType,
            actual: actualType,
          });
        }
      }

      if (typeof value === 'object' && value !== null) {
        checkDataTypes(value, currentPath, mismatches);
      }
    }
  }
}

function checkCommonMissingVariables(
  dataLayer: TealiumDataLayer,
  missing: string[]
): void {
  // Check page data
  if (!dataLayer.page) {
    missing.push('page (entire object)');
  } else {
    if (!dataLayer.page.pageName) missing.push('page.pageName');
    if (!dataLayer.page.pageType) missing.push('page.pageType');
  }

  // Check user data
  if (!dataLayer.user) {
    missing.push('user (entire object)');
  } else {
    if (!dataLayer.user.visitorId && !dataLayer.user.userId) {
      missing.push('user.visitorId or user.userId');
    }
  }

  // Check hotel-specific if booking exists
  if (dataLayer.booking) {
    if (!dataLayer.hotel?.hotelCode) missing.push('hotel.hotelCode');
    if (!dataLayer.booking.bookingCurrency) missing.push('booking.bookingCurrency');
  }

  // Check search-specific
  if (dataLayer.search) {
    if (!dataLayer.search.searchDestination && !dataLayer.hotel) {
      missing.push('search.searchDestination or hotel context');
    }
  }
}

function checkEventTracking(
  dataLayer: TealiumDataLayer,
  issues: DebugIssue[],
  recommendations: string[]
): void {
  if (dataLayer.event) {
    // Check event name format
    if (dataLayer.event.eventName) {
      const name = dataLayer.event.eventName;

      // Check for spaces (common mistake)
      if (name.includes(' ')) {
        issues.push({
          severity: 'warning',
          path: 'event.eventName',
          issue: `Event name contains spaces: "${name}"`,
          recommendation: 'Use snake_case or dot.notation (e.g., "booking_completed" or "booking.completed")',
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
    }

    // Check for missing event category
    if (!dataLayer.event.eventCategory) {
      recommendations.push('Add eventCategory for better event organization in reports');
    }
  }
}

function checkBookingFunnel(
  dataLayer: TealiumDataLayer,
  issues: DebugIssue[],
  recommendations: string[]
): void {
  // Check booking data consistency
  if (dataLayer.booking) {
    const booking = dataLayer.booking;

    // Check if hotel data is present
    if (!dataLayer.hotel && booking.bookingId) {
      issues.push({
        severity: 'error',
        path: 'hotel',
        issue: 'Booking exists but hotel data is missing',
        recommendation: 'Include hotel.hotelCode and hotel.hotelName with booking data',
      });
    }

    // Check dates
    if (booking.bookingCheckIn && booking.bookingCheckOut) {
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

function checkSpecificArea(
  dataLayer: TealiumDataLayer,
  checkpoint: string,
  issues: DebugIssue[],
  recommendations: string[]
): void {
  switch (checkpoint.toLowerCase()) {
    case 'ecommerce':
    case 'products':
      if (dataLayer.products && Array.isArray(dataLayer.products)) {
        for (let i = 0; i < dataLayer.products.length; i++) {
          const product = dataLayer.products[i];
          if (!product.productId) {
            issues.push({
              severity: 'error',
              path: `products[${i}].productId`,
              issue: 'Product missing productId',
              recommendation: 'Every product must have a unique identifier',
            });
          }
        }
      }
      break;

    case 'loyalty':
    case 'guest':
      if (!dataLayer.guest && dataLayer.user?.userType === 'loyalty') {
        issues.push({
          severity: 'warning',
          path: 'guest',
          issue: 'User is loyalty member but guest data is missing',
          recommendation: 'Include guest.guestLoyaltyTier and guest.guestLoyaltyPoints',
        });
      }
      break;

    case 'search':
      if (dataLayer.search && !dataLayer.search.searchCheckIn) {
        recommendations.push('Include check-in and check-out dates in search data for better analysis');
      }
      break;
  }
}

function generateRecommendations(
  dataLayer: TealiumDataLayer,
  issues: DebugIssue[],
  recommendations: string[]
): void {
  // Error count threshold
  const errorCount = issues.filter(i => i.severity === 'error').length;
  if (errorCount > 5) {
    recommendations.push('Consider reviewing your data layer implementation - multiple critical issues detected');
  }

  // Missing core data
  if (!dataLayer.page?.pageType) {
    recommendations.push('Add page.pageType for better page classification in analytics');
  }

  // Currency consistency
  if (dataLayer.booking?.bookingCurrency && dataLayer.page?.currency) {
    if (dataLayer.booking.bookingCurrency !== dataLayer.page.currency) {
      recommendations.push('Ensure page.currency and booking.bookingCurrency are consistent');
    }
  }
}

export function formatDebugResult(result: DebugResult): string {
  const lines: string[] = [];

  lines.push('# Data Layer Debug Report');
  lines.push('');

  // Summary
  const errorCount = result.issues.filter(i => i.severity === 'error').length;
  const warningCount = result.issues.filter(i => i.severity === 'warning').length;
  const infoCount = result.issues.filter(i => i.severity === 'info').length;

  lines.push('## Summary');
  lines.push(`- 🔴 Errors: ${errorCount}`);
  lines.push(`- 🟡 Warnings: ${warningCount}`);
  lines.push(`- 🔵 Info: ${infoCount}`);
  lines.push(`- Missing variables: ${result.missingVariables.length}`);
  lines.push(`- Type mismatches: ${result.typeMismatches.length}`);
  lines.push('');

  // Issues
  if (result.issues.length > 0) {
    lines.push('## Issues');
    lines.push('');

    const grouped = {
      error: result.issues.filter(i => i.severity === 'error'),
      warning: result.issues.filter(i => i.severity === 'warning'),
      info: result.issues.filter(i => i.severity === 'info'),
    };

    if (grouped.error.length > 0) {
      lines.push('### 🔴 Errors');
      for (const issue of grouped.error) {
        lines.push(`- **${issue.path}**: ${issue.issue}`);
        lines.push(`  - Fix: ${issue.recommendation}`);
      }
      lines.push('');
    }

    if (grouped.warning.length > 0) {
      lines.push('### 🟡 Warnings');
      for (const issue of grouped.warning) {
        lines.push(`- **${issue.path}**: ${issue.issue}`);
        lines.push(`  - Suggestion: ${issue.recommendation}`);
      }
      lines.push('');
    }

    if (grouped.info.length > 0) {
      lines.push('### 🔵 Info');
      for (const issue of grouped.info) {
        lines.push(`- **${issue.path}**: ${issue.issue}`);
      }
      lines.push('');
    }
  }

  // Missing variables
  if (result.missingVariables.length > 0) {
    lines.push('## Missing Variables');
    for (const variable of result.missingVariables) {
      lines.push(`- \`${variable}\``);
    }
    lines.push('');
  }

  // Type mismatches
  if (result.typeMismatches.length > 0) {
    lines.push('## Type Mismatches');
    for (const mismatch of result.typeMismatches) {
      lines.push(`- \`${mismatch.path}\`: expected **${mismatch.expected}**, got **${mismatch.actual}**`);
    }
    lines.push('');
  }

  // Recommendations
  if (result.recommendations.length > 0) {
    lines.push('## Recommendations');
    for (const rec of result.recommendations) {
      lines.push(`- ${rec}`);
    }
  }

  return lines.join('\n');
}
