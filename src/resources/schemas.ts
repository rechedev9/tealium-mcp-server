// Standard Data Layer Schema
export const standardSchema = {
  $id: 'tealium://schema/standard',
  type: 'object',
  properties: {
    page: {
      type: 'object',
      properties: {
        pageName: { type: 'string', minLength: 1 },
        pageType: { type: 'string' },
        pageCategory: { type: 'string' },
        pageSubcategory: { type: 'string' },
        language: { type: 'string', pattern: '^[a-z]{2}(-[A-Z]{2})?$' },
        country: { type: 'string', pattern: '^[A-Z]{2}$' },
        currency: { type: 'string', pattern: '^[A-Z]{3}$' },
      },
      required: ['pageName'],
    },
    user: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        visitorId: { type: 'string' },
        userType: { type: 'string', enum: ['guest', 'registered', 'premium'] },
        isLoggedIn: { type: 'boolean' },
      },
    },
    event: {
      type: 'object',
      properties: {
        eventName: { type: 'string', minLength: 1 },
        eventCategory: { type: 'string' },
        eventAction: { type: 'string' },
        eventLabel: { type: 'string' },
        eventValue: { type: 'number' },
      },
      required: ['eventName'],
    },
  },
} as const;

// E-commerce Schema
export const ecommerceSchema = {
  $id: 'tealium://schema/ecommerce',
  type: 'object',
  properties: {
    ...standardSchema.properties,
    product: {
      type: 'object',
      properties: {
        productId: { type: 'string', minLength: 1 },
        productName: { type: 'string', minLength: 1 },
        productCategory: { type: 'string' },
        productBrand: { type: 'string' },
        productPrice: { type: 'number', minimum: 0 },
        productQuantity: { type: 'integer', minimum: 1 },
        productVariant: { type: 'string' },
        productSku: { type: 'string' },
      },
      required: ['productId', 'productName'],
    },
    products: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          productId: { type: 'string', minLength: 1 },
          productName: { type: 'string', minLength: 1 },
          productCategory: { type: 'string' },
          productBrand: { type: 'string' },
          productPrice: { type: 'number', minimum: 0 },
          productQuantity: { type: 'integer', minimum: 1 },
        },
        required: ['productId', 'productName'],
      },
    },
    transaction: {
      type: 'object',
      properties: {
        transactionId: { type: 'string', minLength: 1 },
        transactionTotal: { type: 'number', minimum: 0 },
        transactionTax: { type: 'number', minimum: 0 },
        transactionShipping: { type: 'number', minimum: 0 },
        transactionCurrency: { type: 'string', pattern: '^[A-Z]{3}$' },
        transactionPaymentMethod: { type: 'string' },
      },
      required: ['transactionId', 'transactionTotal'],
    },
  },
} as const;

// Hotel Industry Schema
export const hotelSchema = {
  $id: 'tealium://schema/hotels',
  type: 'object',
  properties: {
    ...standardSchema.properties,
    search: {
      type: 'object',
      properties: {
        searchDestination: { type: 'string' },
        searchCheckIn: { type: 'string', format: 'date' },
        searchCheckOut: { type: 'string', format: 'date' },
        searchAdults: { type: 'integer', minimum: 1 },
        searchChildren: { type: 'integer', minimum: 0 },
        searchRooms: { type: 'integer', minimum: 1 },
        searchFlexibleDates: { type: 'boolean' },
      },
    },
    hotel: {
      type: 'object',
      properties: {
        hotelCode: { type: 'string', minLength: 1 },
        hotelName: { type: 'string', minLength: 1 },
        hotelBrand: { type: 'string' },
        hotelCity: { type: 'string' },
        hotelCountry: { type: 'string', pattern: '^[A-Z]{2}$' },
        hotelStarRating: { type: 'number', minimum: 1, maximum: 5 },
        hotelCategory: {
          type: 'string',
          enum: ['resort', 'city', 'beach', 'boutique', 'business'],
        },
      },
      required: ['hotelCode', 'hotelName'],
    },
    room: {
      type: 'object',
      properties: {
        roomType: { type: 'string', minLength: 1 },
        roomCode: { type: 'string' },
        roomName: { type: 'string' },
        roomCapacity: { type: 'integer', minimum: 1 },
        roomAmenities: { type: 'array', items: { type: 'string' } },
      },
      required: ['roomType'],
    },
    booking: {
      type: 'object',
      properties: {
        bookingId: { type: 'string' },
        bookingStatus: { type: 'string', enum: ['pending', 'confirmed', 'cancelled', 'completed'] },
        bookingCheckIn: { type: 'string', format: 'date' },
        bookingCheckOut: { type: 'string', format: 'date' },
        bookingNights: { type: 'integer', minimum: 1 },
        bookingAdults: { type: 'integer', minimum: 1 },
        bookingChildren: { type: 'integer', minimum: 0 },
        bookingRooms: { type: 'integer', minimum: 1 },
        bookingRateCode: { type: 'string' },
        bookingRateName: { type: 'string' },
        bookingTotal: { type: 'number', minimum: 0 },
        bookingCurrency: { type: 'string', pattern: '^[A-Z]{3}$' },
        bookingTaxes: { type: 'number', minimum: 0 },
        bookingFees: { type: 'number', minimum: 0 },
      },
      required: [
        'bookingCheckIn',
        'bookingCheckOut',
        'bookingNights',
        'bookingAdults',
        'bookingRooms',
        'bookingTotal',
        'bookingCurrency',
      ],
    },
    guest: {
      type: 'object',
      properties: {
        guestType: { type: 'string', enum: ['new', 'returning', 'loyalty'] },
        guestLoyaltyId: { type: 'string' },
        guestLoyaltyTier: { type: 'string' },
        guestLoyaltyPoints: { type: 'integer', minimum: 0 },
        guestPreferences: { type: 'array', items: { type: 'string' } },
      },
    },
  },
} as const;

// Schema registry
export const schemas: Record<string, object> = {
  'tealium://schema/standard': standardSchema,
  'tealium://schema/ecommerce': ecommerceSchema,
  'tealium://schema/hotels': hotelSchema,
};

export function getSchema(uri: string): object | null {
  return schemas[uri] ?? null;
}

export function listSchemas(): { uri: string; name: string; description: string }[] {
  return [
    {
      uri: 'tealium://schema/standard',
      name: 'Standard Data Layer Schema',
      description: 'Basic schema for page, user, and event data',
    },
    {
      uri: 'tealium://schema/ecommerce',
      name: 'E-commerce Schema',
      description: 'Schema for product, cart, and transaction tracking',
    },
    {
      uri: 'tealium://schema/hotels',
      name: 'Hotel Industry Schema',
      description: 'Schema for hotel search, booking, and guest tracking',
    },
  ];
}
