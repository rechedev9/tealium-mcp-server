export const bestPractices = `# Tealium Data Layer Best Practices

## 1. Naming Conventions

### Variable Names
- Use **camelCase** for all variable names
- Be descriptive and specific (e.g., \`productPrice\` not \`price\`)
- Use consistent prefixes for related variables (e.g., \`booking*\`, \`hotel*\`, \`guest*\`)
- Avoid abbreviations unless universally understood

### Event Names
- Use **snake_case** or **dot.notation** for event names
- Include action and object (e.g., \`booking.completed\`, \`room_viewed\`)
- Be consistent across the entire implementation

## 2. Data Types

### Consistency
- Always use the same data type for a variable across all events
- Use strings for IDs, codes, and categorical values
- Use numbers only for measurable/calculable values
- Use booleans for true/false flags

### Common Patterns
| Variable Type | Data Type | Example |
|--------------|-----------|---------|
| IDs | string | \`"USR-123456"\` |
| Prices | number | \`199.99\` |
| Quantities | integer | \`2\` |
| Dates | string (ISO) | \`"2024-03-15"\` |
| Flags | boolean | \`true\` |
| Lists | array | \`["wifi", "pool"]\` |

## 3. Required vs Optional

### Always Required
- \`page.pageName\` - Every page must have a name
- \`event.eventName\` - Every event must have a name
- \`user.visitorId\` - Anonymous visitor tracking

### Conditionally Required
- \`transaction.transactionId\` - Required on purchase
- \`booking.bookingId\` - Required after booking confirmation
- \`product.productId\` - Required when product context exists

## 4. Hotel/Travel Specific

### Booking Funnel Events
1. \`search.initiated\` - User starts a search
2. \`search.results\` - Results are displayed
3. \`hotel.viewed\` - Hotel detail page
4. \`room.selected\` - Room type selected
5. \`booking.started\` - Checkout initiated
6. \`booking.completed\` - Booking confirmed

### Required Hotel Variables
- \`hotel.hotelCode\` - Unique hotel identifier
- \`booking.bookingCheckIn\` - Check-in date
- \`booking.bookingCheckOut\` - Check-out date
- \`booking.bookingTotal\` - Total price
- \`booking.bookingCurrency\` - Currency code (ISO 4217)

## 5. Validation

### Before Sending
- Validate data types match expected schema
- Check required fields are present
- Sanitize user input (remove PII from free text)
- Handle null/undefined gracefully

### Common Issues
- Prices as strings instead of numbers
- Missing required fields on certain pages
- Inconsistent date formats
- PII in unexpected fields

## 6. Performance

### Loading
- Initialize data layer before TiQ loads
- Use \`utag_data\` for page load variables
- Use \`utag.link()\` for event tracking

### Size Management
- Keep data layer object under 100KB
- Remove temporary variables after use
- Don't duplicate data unnecessarily

## 7. Privacy & Compliance

### PII Handling
- Never put raw PII in the data layer
- Hash email addresses if needed for matching
- Use anonymous IDs instead of names
- Respect consent preferences

### Consent Integration
- Check consent before tracking
- Use Tealium Consent Manager
- Implement proper opt-out mechanisms

## 8. Testing

### QA Checklist
- [ ] All required variables present
- [ ] Data types are correct
- [ ] Events fire at right moments
- [ ] Values are realistic/valid
- [ ] No console errors
- [ ] Works across browsers
- [ ] Mobile responsive
`;

export const hotelTemplate = `// Hotel Booking Data Layer Template

// Initialize the data layer
window.utag_data = window.utag_data || {};

// Page Data (required on all pages)
window.utag_data.page = {
  pageName: '',      // e.g., "Home", "Search Results", "Hotel Detail"
  pageType: '',      // e.g., "home", "search", "hotel", "booking", "confirmation"
  pageCategory: '',  // e.g., "acquisition", "booking-funnel", "account"
  language: '',      // e.g., "en-US", "es-ES"
  country: '',       // e.g., "US", "ES"
  currency: ''       // e.g., "USD", "EUR"
};

// User Data (required on all pages)
window.utag_data.user = {
  visitorId: '',     // Anonymous visitor ID
  userId: '',        // Logged-in user ID (if available)
  userType: '',      // "guest", "registered", "loyalty"
  isLoggedIn: false
};

// Guest/Loyalty Data (when user is logged in)
window.utag_data.guest = {
  guestType: '',         // "new", "returning", "loyalty"
  guestLoyaltyId: '',    // Loyalty program ID
  guestLoyaltyTier: '',  // "bronze", "silver", "gold", "platinum"
  guestLoyaltyPoints: 0
};

// Search Data (on search results page)
window.utag_data.search = {
  searchDestination: '',
  searchCheckIn: '',     // ISO date: "2024-03-15"
  searchCheckOut: '',    // ISO date: "2024-03-18"
  searchAdults: 2,
  searchChildren: 0,
  searchRooms: 1,
  searchFlexibleDates: false
};

// Hotel Data (on hotel detail and booking pages)
window.utag_data.hotel = {
  hotelCode: '',         // Unique hotel identifier
  hotelName: '',
  hotelBrand: '',        // e.g., "Barceló", "Occidental"
  hotelCity: '',
  hotelCountry: '',      // ISO country code
  hotelStarRating: 0,    // 1-5
  hotelCategory: ''      // "resort", "city", "beach"
};

// Room Data (when room is selected)
window.utag_data.room = {
  roomType: '',          // e.g., "standard", "deluxe", "suite"
  roomCode: '',
  roomName: '',
  roomCapacity: 2
};

// Booking Data (in booking funnel and confirmation)
window.utag_data.booking = {
  bookingId: '',         // Populated after confirmation
  bookingStatus: '',     // "pending", "confirmed"
  bookingCheckIn: '',
  bookingCheckOut: '',
  bookingNights: 0,
  bookingAdults: 0,
  bookingChildren: 0,
  bookingRooms: 0,
  bookingRateCode: '',
  bookingRateName: '',
  bookingTotal: 0,
  bookingCurrency: '',
  bookingTaxes: 0,
  bookingFees: 0
};

// Event tracking function
function trackEvent(eventName, eventData) {
  const eventPayload = {
    event: {
      eventName: eventName,
      ...eventData
    },
    ...window.utag_data
  };

  if (window.utag && typeof window.utag.link === 'function') {
    window.utag.link(eventPayload);
  }
}

// Example event calls:
// trackEvent('search.initiated', { eventCategory: 'booking-funnel' });
// trackEvent('hotel.viewed', { eventCategory: 'booking-funnel' });
// trackEvent('room.selected', { eventCategory: 'booking-funnel' });
// trackEvent('booking.completed', { eventCategory: 'conversion' });
`;

export const basicTemplate = `// Basic Tealium Data Layer Template

// Initialize the data layer before TiQ loads
window.utag_data = window.utag_data || {};

// Page Data
window.utag_data.page = {
  pageName: '',      // Required: unique page identifier
  pageType: '',      // Page classification
  pageCategory: '',  // Primary category
  language: '',      // e.g., "en-US"
  country: ''        // e.g., "US"
};

// User Data
window.utag_data.user = {
  visitorId: '',     // Anonymous visitor ID
  userId: '',        // Authenticated user ID
  userType: '',      // User classification
  isLoggedIn: false
};

// Event tracking helper
function trackEvent(eventName, data) {
  if (window.utag && window.utag.link) {
    window.utag.link({
      event: { eventName, ...data },
      ...window.utag_data
    });
  }
}
`;

export const templates: Record<string, string> = {
  'tealium://templates/basic': basicTemplate,
  'tealium://templates/hotel-booking': hotelTemplate,
};

export function getTemplate(uri: string): string | null {
  return templates[uri] ?? null;
}

export function listTemplates(): { uri: string; name: string; description: string }[] {
  return [
    {
      uri: 'tealium://templates/basic',
      name: 'Basic Data Layer Template',
      description: 'Minimal data layer setup with page and user tracking',
    },
    {
      uri: 'tealium://templates/hotel-booking',
      name: 'Hotel Booking Template',
      description: 'Complete hotel booking funnel data layer implementation',
    },
  ];
}
