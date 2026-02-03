import type {
  TealiumDataLayer,
  PageData,
  UserData,
  EventData,
  ProductData,
  TransactionData,
  HotelSearchData,
  HotelData,
  RoomData,
  BookingData,
  GuestData,
  TrackingSpec,
  TrackingVariable,
  TrackingEvent,
} from './index.js';

/**
 * Checks if a value is a non-null object (not an array).
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Checks if a value is a string.
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Checks if a value is a number.
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

/**
 * Checks if a value is a boolean.
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Checks if a value is an array.
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Checks if a value is a string array.
 */
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/**
 * Checks if a value is a valid PageData object.
 */
export function isPageData(value: unknown): value is PageData {
  if (!isRecord(value)) return false;
  const page = value;
  return typeof page.pageName === 'string';
}

/**
 * Checks if a value is a valid UserData object.
 */
export function isUserData(value: unknown): value is UserData {
  if (!isRecord(value)) return false;
  return true;
}

/**
 * Checks if a value is a valid EventData object.
 */
export function isEventData(value: unknown): value is EventData {
  if (!isRecord(value)) return false;
  const event = value;
  return typeof event.eventName === 'string';
}

/**
 * Checks if a value is a valid ProductData object.
 */
export function isProductData(value: unknown): value is ProductData {
  if (!isRecord(value)) return false;
  const product = value;
  return typeof product.productId === 'string' && typeof product.productName === 'string';
}

/**
 * Checks if a value is a valid ProductData array.
 */
export function isProductDataArray(value: unknown): value is ProductData[] {
  return Array.isArray(value) && value.every(isProductData);
}

/**
 * Checks if a value is a valid TransactionData object.
 */
export function isTransactionData(value: unknown): value is TransactionData {
  if (!isRecord(value)) return false;
  const transaction = value;
  return (
    typeof transaction.transactionId === 'string' &&
    typeof transaction.transactionTotal === 'number'
  );
}

/**
 * Checks if a value is a valid HotelSearchData object.
 */
export function isHotelSearchData(value: unknown): value is HotelSearchData {
  if (!isRecord(value)) return false;
  return true;
}

/**
 * Checks if a value is a valid HotelData object.
 */
export function isHotelData(value: unknown): value is HotelData {
  if (!isRecord(value)) return false;
  const hotel = value;
  return typeof hotel.hotelCode === 'string' && typeof hotel.hotelName === 'string';
}

/**
 * Checks if a value is a valid RoomData object.
 */
export function isRoomData(value: unknown): value is RoomData {
  if (!isRecord(value)) return false;
  const room = value;
  return typeof room.roomType === 'string';
}

/**
 * Checks if a value is a valid BookingData object.
 */
export function isBookingData(value: unknown): value is BookingData {
  if (!isRecord(value)) return false;
  const booking = value;
  return (
    typeof booking.bookingCheckIn === 'string' &&
    typeof booking.bookingCheckOut === 'string' &&
    typeof booking.bookingNights === 'number' &&
    typeof booking.bookingAdults === 'number' &&
    typeof booking.bookingRooms === 'number' &&
    typeof booking.bookingTotal === 'number' &&
    typeof booking.bookingCurrency === 'string'
  );
}

/**
 * Checks if a value is a valid GuestData object.
 */
export function isGuestData(value: unknown): value is GuestData {
  if (!isRecord(value)) return false;
  return true;
}

/**
 * Checks if a value is a valid TealiumDataLayer object.
 */
export function isTealiumDataLayer(value: unknown): value is TealiumDataLayer {
  if (!isRecord(value)) return false;

  const dl = value;

  if (dl.page !== undefined && !isPageData(dl.page)) return false;
  if (dl.user !== undefined && !isUserData(dl.user)) return false;
  if (dl.event !== undefined && !isEventData(dl.event)) return false;
  if (dl.product !== undefined && !isProductData(dl.product)) return false;
  if (dl.products !== undefined && !isProductDataArray(dl.products)) return false;
  if (dl.transaction !== undefined && !isTransactionData(dl.transaction)) return false;
  if (dl.search !== undefined && !isHotelSearchData(dl.search)) return false;
  if (dl.hotel !== undefined && !isHotelData(dl.hotel)) return false;
  if (dl.room !== undefined && !isRoomData(dl.room)) return false;
  if (dl.booking !== undefined && !isBookingData(dl.booking)) return false;
  if (dl.guest !== undefined && !isGuestData(dl.guest)) return false;

  return true;
}

/**
 * Checks if a value is a valid TrackingVariable object.
 */
export function isTrackingVariable(value: unknown): value is TrackingVariable {
  if (!isRecord(value)) return false;
  const v = value;
  return (
    typeof v.name === 'string' &&
    typeof v.description === 'string' &&
    typeof v.type === 'string' &&
    ['string', 'number', 'boolean', 'array', 'object'].includes(v.type) &&
    typeof v.required === 'boolean'
  );
}

/**
 * Checks if a value is a valid TrackingEvent object.
 */
export function isTrackingEvent(value: unknown): value is TrackingEvent {
  if (!isRecord(value)) return false;
  const e = value;
  return (
    typeof e.name === 'string' &&
    typeof e.description === 'string' &&
    typeof e.trigger === 'string' &&
    Array.isArray(e.variables) &&
    (e.variables as unknown[]).every(isTrackingVariable)
  );
}

/**
 * Checks if a value is a valid TrackingSpec object.
 */
export function isTrackingSpec(value: unknown): value is TrackingSpec {
  if (!isRecord(value)) return false;
  const spec = value;
  return (
    typeof spec.name === 'string' &&
    Array.isArray(spec.variables) &&
    (spec.variables as unknown[]).every(isTrackingVariable) &&
    Array.isArray(spec.events) &&
    (spec.events as unknown[]).every(isTrackingEvent)
  );
}

/**
 * Safely gets a property from an object.
 */
export function getProperty(obj: Record<string, unknown>, key: string): unknown {
  return obj[key];
}
