// Data Layer Types

export interface PageData {
  pageName: string;
  pageType?: string;
  pageCategory?: string;
  pageSubcategory?: string;
  language?: string;
  country?: string;
  currency?: string;
}

export interface UserData {
  userId?: string;
  visitorId?: string;
  userType?: string;
  isLoggedIn?: boolean;
  loyaltyTier?: string;
  loyaltyPoints?: number;
}

export interface EventData {
  eventName: string;
  eventCategory?: string;
  eventAction?: string;
  eventLabel?: string;
  eventValue?: number;
}

// E-commerce Types

export interface ProductData {
  productId: string;
  productName: string;
  productCategory?: string;
  productBrand?: string;
  productPrice?: number;
  productQuantity?: number;
  productVariant?: string;
  productSku?: string;
}

export interface TransactionData {
  transactionId: string;
  transactionTotal: number;
  transactionTax?: number;
  transactionShipping?: number;
  transactionCurrency?: string;
  transactionPaymentMethod?: string;
  products?: ProductData[];
}

// Hotel Industry Types

export interface HotelSearchData {
  searchDestination?: string;
  searchCheckIn?: string;
  searchCheckOut?: string;
  searchAdults?: number;
  searchChildren?: number;
  searchRooms?: number;
  searchFlexibleDates?: boolean;
}

export interface HotelData {
  hotelCode: string;
  hotelName: string;
  hotelBrand?: string;
  hotelCity?: string;
  hotelCountry?: string;
  hotelStarRating?: number;
  hotelCategory?: string;
}

export interface RoomData {
  roomType: string;
  roomCode?: string;
  roomName?: string;
  roomCapacity?: number;
  roomAmenities?: string[];
}

export interface BookingData {
  bookingId?: string;
  bookingStatus?: string;
  bookingCheckIn: string;
  bookingCheckOut: string;
  bookingNights: number;
  bookingAdults: number;
  bookingChildren?: number;
  bookingRooms: number;
  bookingRateCode?: string;
  bookingRateName?: string;
  bookingTotal: number;
  bookingCurrency: string;
  bookingTaxes?: number;
  bookingFees?: number;
  hotel?: HotelData;
  room?: RoomData;
}

export interface GuestData {
  guestType?: 'new' | 'returning' | 'loyalty';
  guestLoyaltyId?: string;
  guestLoyaltyTier?: string;
  guestLoyaltyPoints?: number;
  guestPreferences?: string[];
}

// Main Data Layer Interface

export interface TealiumDataLayer {
  page?: PageData;
  user?: UserData;
  event?: EventData;
  product?: ProductData;
  products?: ProductData[];
  transaction?: TransactionData;
  search?: HotelSearchData;
  hotel?: HotelData;
  room?: RoomData;
  booking?: BookingData;
  guest?: GuestData;
  [key: string]: unknown;
}

// Validation Types

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
  summary: string;
}

export interface ValidationError {
  path: string;
  message: string;
  value?: unknown;
  expected?: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
  suggestion?: string;
}

// Tracking Spec Types

export interface TrackingVariable {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  example?: string | number | boolean;
  allowedValues?: (string | number)[];
  format?: string;
}

export interface TrackingEvent {
  name: string;
  description: string;
  trigger: string;
  variables: TrackingVariable[];
}

export interface TrackingSpec {
  name: string;
  version?: string;
  description?: string;
  variables: TrackingVariable[];
  events: TrackingEvent[];
}

// Debug Types

export interface DebugIssue {
  severity: 'error' | 'warning' | 'info';
  path: string;
  issue: string;
  recommendation: string;
}

export interface DebugResult {
  dataLayerSnapshot: TealiumDataLayer;
  issues: DebugIssue[];
  missingVariables: string[];
  typeMismatches: Array<{
    path: string;
    expected: string;
    actual: string;
  }>;
  recommendations: string[];
}

// Code Generation Types

export interface GeneratedCode {
  code: string;
  language: 'typescript' | 'javascript';
  imports?: string[];
  filename?: string;
}
