# Tealium MCP Server

An MCP (Model Context Protocol) server for Tealium data layer validation, documentation generation, debugging, and code generation. Built for tag management specialists and analytics engineers.

## Features

### Tools

| Tool | Description |
|------|-------------|
| `validate_data_layer` | Validate data layers against schemas and Tealium best practices |
| `generate_documentation` | Generate Markdown or JSON Schema documentation from specs |
| `debug_data_layer` | Diagnose issues, find missing variables, detect type mismatches |
| `generate_code` | Generate TypeScript/JavaScript code from specifications |
| `parse_tracking_spec` | Parse CSV/JSON tracking specs from spreadsheets |

### Resources

| Resource | Description |
|----------|-------------|
| `tealium://schema/standard` | Standard data layer schema (page, user, event) |
| `tealium://schema/ecommerce` | E-commerce schema (products, transactions) |
| `tealium://schema/hotels` | Hotel industry schema (bookings, rooms, guests) |
| `tealium://templates/basic` | Basic data layer template |
| `tealium://templates/hotel-booking` | Hotel booking funnel template |
| `tealium://best-practices` | Tealium implementation best practices |

## Installation

```bash
# Clone or download this repository
cd tealium-mcp-server

# Install dependencies
npm install

# Build
npm run build
```

## Configuration

### Claude Code

```bash
# Add the server to Claude Code
claude mcp add --transport stdio tealium -- node /path/to/tealium-mcp-server/dist/index.js

# Verify it's configured
claude mcp list
```

### Claude Desktop

Edit your Claude Desktop config file:

**Linux/WSL:** `~/.config/Claude/claude_desktop_config.json`
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "tealium": {
      "command": "node",
      "args": ["/path/to/tealium-mcp-server/dist/index.js"]
    }
  }
}
```

## Usage Examples

### Validate a Data Layer

Ask Claude:
> "Validate this data layer: { page: { pageName: 'Home' }, user: { isLoggedIn: true } }"

### Debug Tracking Issues

Ask Claude:
> "Debug this data layer from my booking page and tell me what's wrong"

Then paste your data layer JSON from the browser console.

### Generate Documentation

Ask Claude:
> "Generate documentation for my tracking specification"

Then provide your spec in JSON or paste CSV content.

### Generate TypeScript Code

Ask Claude:
> "Generate TypeScript interfaces for my hotel booking data layer"

### Parse a Tracking Spec

Ask Claude:
> "Parse this tracking spec from my Google Sheet"

Then paste CSV content with columns like: variable, type, required, description

## Daily Workflow

### 1. Validating Implementations

When a developer sends a data layer for review or when checking a live page:

```
"Validate this data layer against the hotel schema:
{
  page: { pageName: 'Booking Confirmation', pageType: 'confirmation' },
  hotel: { hotelCode: 'BCN001', hotelName: 'Barceló Sants' },
  booking: { bookingId: 'RES123', bookingTotal: 450, bookingCurrency: 'EUR' }
}"
```

### 2. Debugging Tracking Issues

When something isn't tracking correctly (e.g., QA finds missing data in reports):

```
"Debug this data layer from the booking page - events aren't firing correctly:
[paste JSON from browser console: copy(utag_data)]"
```

The tool will identify:
- Missing required variables
- Wrong data types (string vs number)
- Invalid dates
- Empty values
- PII exposure risks

### 3. Creating Documentation

When onboarding new developers or updating tracking specs:

```
"Generate documentation for our hotel booking data layer"
```

Or from an existing spec:
```
"Parse this tracking spec and generate documentation:
[paste CSV from Google Sheets]"
```

### 4. Generating Code for Developers

When developers need implementation code:

```
"Generate TypeScript code for our booking funnel data layer with these events:
- search.initiated
- hotel.viewed
- room.selected
- booking.completed"
```

### 5. Reviewing New Tracking Specs

When the analytics team sends a new tracking requirement (usually a spreadsheet):

```
"Parse this tracking spec from our Google Sheet:

variable,type,required,description
page.pageName,string,true,Page identifier
booking.bookingTotal,number,true,Total booking amount
booking.bookingCurrency,string,true,ISO currency code
..."
```

## Quick Reference

| Task | Ask Claude |
|------|-----------|
| Validate data layer | *"Validate this data layer: {...}"* |
| Debug issues | *"Debug this data layer: {...}"* |
| Generate docs | *"Generate documentation for this spec"* |
| Generate code | *"Generate TypeScript for this data layer"* |
| Parse spreadsheet | *"Parse this tracking spec: [CSV]"* |
| Get best practices | *"Show me Tealium best practices"* |
| Get hotel template | *"Show me the hotel booking template"* |

## Pro Tip: Browser Console

To quickly grab the data layer from any page:

```javascript
// In browser DevTools console:
copy(JSON.stringify(utag_data, null, 2))
```

Then paste it into Claude with *"Debug this data layer"* or *"Validate this"*.

## Testing

```bash
# Use the MCP Inspector to test
npx @modelcontextprotocol/inspector node dist/index.js
```

## Hotel Industry Schema

This server includes specialized support for hotel/travel tracking:

- **Search data**: destination, check-in/out dates, guests, rooms
- **Hotel data**: code, name, brand, star rating, category
- **Room data**: type, code, capacity, amenities
- **Booking data**: ID, status, dates, nights, rates, totals
- **Guest data**: type, loyalty ID, tier, points

Perfect for hotel chains like Barcelo, Marriott, Hilton, etc.

## Development

```bash
# Build
npm run build

# Run development (build + start)
npm run dev
```

## License

MIT
