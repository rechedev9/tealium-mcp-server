// Data Layer Types

export interface PageData {
  readonly pageName: string;
  readonly pageType?: string;
  readonly pageCategory?: string;
  readonly pageSubcategory?: string;
  readonly language?: string;
  readonly country?: string;
  readonly currency?: string;
}

export interface UserData {
  readonly userId?: string;
  readonly visitorId?: string;
  readonly userType?: string;
  readonly isLoggedIn?: boolean;
  readonly loyaltyTier?: string;
  readonly loyaltyPoints?: number;
}

export interface EventData {
  readonly eventName: string;
  readonly eventCategory?: string;
  readonly eventAction?: string;
  readonly eventLabel?: string;
  readonly eventValue?: number;
}

// E-commerce Types

export interface ProductData {
  readonly productId: string;
  readonly productName: string;
  readonly productCategory?: string;
  readonly productBrand?: string;
  readonly productPrice?: number;
  readonly productQuantity?: number;
  readonly productVariant?: string;
  readonly productSku?: string;
}

export interface TransactionData {
  readonly transactionId: string;
  readonly transactionTotal: number;
  readonly transactionTax?: number;
  readonly transactionShipping?: number;
  readonly transactionCurrency?: string;
  readonly transactionPaymentMethod?: string;
  readonly products?: readonly ProductData[];
}

// Hotel Industry Types

export interface HotelSearchData {
  readonly searchDestination?: string;
  readonly searchCheckIn?: string;
  readonly searchCheckOut?: string;
  readonly searchAdults?: number;
  readonly searchChildren?: number;
  readonly searchRooms?: number;
  readonly searchFlexibleDates?: boolean;
}

export interface HotelData {
  readonly hotelCode: string;
  readonly hotelName: string;
  readonly hotelBrand?: string;
  readonly hotelCity?: string;
  readonly hotelCountry?: string;
  readonly hotelStarRating?: number;
  readonly hotelCategory?: string;
}

export interface RoomData {
  readonly roomType: string;
  readonly roomCode?: string;
  readonly roomName?: string;
  readonly roomCapacity?: number;
  readonly roomAmenities?: readonly string[];
}

export interface BookingData {
  readonly bookingId?: string;
  readonly bookingStatus?: string;
  readonly bookingCheckIn: string;
  readonly bookingCheckOut: string;
  readonly bookingNights: number;
  readonly bookingAdults: number;
  readonly bookingChildren?: number;
  readonly bookingRooms: number;
  readonly bookingRateCode?: string;
  readonly bookingRateName?: string;
  readonly bookingTotal: number;
  readonly bookingCurrency: string;
  readonly bookingTaxes?: number;
  readonly bookingFees?: number;
  readonly hotel?: HotelData;
  readonly room?: RoomData;
}

export interface GuestData {
  readonly guestType?: 'new' | 'returning' | 'loyalty';
  readonly guestLoyaltyId?: string;
  readonly guestLoyaltyTier?: string;
  readonly guestLoyaltyPoints?: number;
  readonly guestPreferences?: readonly string[];
}

// Main Data Layer Interface

export interface TealiumDataLayer {
  readonly page?: PageData;
  readonly user?: UserData;
  readonly event?: EventData;
  readonly product?: ProductData;
  readonly products?: readonly ProductData[];
  readonly transaction?: TransactionData;
  readonly search?: HotelSearchData;
  readonly hotel?: HotelData;
  readonly room?: RoomData;
  readonly booking?: BookingData;
  readonly guest?: GuestData;
  readonly [key: string]: unknown;
}

// Validation Types

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly ValidationWarning[];
  readonly suggestions: readonly string[];
  readonly summary: string;
}

export interface ValidationError {
  readonly path: string;
  readonly message: string;
  readonly value?: unknown;
  readonly expected?: string;
}

export interface ValidationWarning {
  readonly path: string;
  readonly message: string;
  readonly suggestion?: string;
}

// Tracking Spec Types

export interface TrackingVariable {
  readonly name: string;
  readonly description: string;
  readonly type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  readonly required: boolean;
  readonly example?: string | number | boolean;
  readonly allowedValues?: readonly (string | number)[];
  readonly format?: string;
}

export interface TrackingEvent {
  readonly name: string;
  readonly description: string;
  readonly trigger: string;
  readonly variables: readonly TrackingVariable[];
}

export interface TrackingSpec {
  readonly name: string;
  readonly version?: string;
  readonly description?: string;
  readonly variables: readonly TrackingVariable[];
  readonly events: readonly TrackingEvent[];
}

// Debug Types

export interface DebugIssue {
  readonly severity: 'error' | 'warning' | 'info';
  readonly path: string;
  readonly issue: string;
  readonly recommendation: string;
}

export interface DebugResult {
  readonly dataLayerSnapshot: TealiumDataLayer;
  readonly issues: readonly DebugIssue[];
  readonly missingVariables: readonly string[];
  readonly typeMismatches: readonly TypeMismatch[];
  readonly recommendations: readonly string[];
}

export interface TypeMismatch {
  readonly path: string;
  readonly expected: string;
  readonly actual: string;
}

// Code Generation Types

export interface GeneratedCode {
  readonly code: string;
  readonly language: 'typescript' | 'javascript';
  readonly imports?: readonly string[];
  readonly filename?: string;
}

// Re-export from other type files
export type { Result } from './result.js';
export { success, failure, unwrap, unwrapOr, mapResult, mapError } from './result.js';
export {
  TealiumError,
  ValidationError as ValidationErrorClass,
  ParseError,
  SchemaError,
  ToolArgumentError,
} from './errors.js';
export {
  isRecord,
  isString,
  isNumber,
  isBoolean,
  isArray,
  isStringArray,
  isTealiumDataLayer,
  isTrackingSpec,
  isTrackingVariable,
  isTrackingEvent,
  isPageData,
  isUserData,
  isEventData,
  isProductData,
  isProductDataArray,
  isTransactionData,
  isHotelSearchData,
  isHotelData,
  isRoomData,
  isBookingData,
  isGuestData,
} from './guards.js';
