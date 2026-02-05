#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { validateDataLayer, formatValidationResult } from './tools/validate.js';
import { generateDocumentation } from './tools/document.js';
import { debugDataLayer, formatDebugResult } from './tools/debug/index.js';
import { generateCode } from './tools/generate.js';
import { parseTrackingSpec, formatParsedSpec } from './tools/parse-spec.js';
import { schemas, listSchemas } from './resources/schemas.js';
import { bestPractices, templates, listTemplates } from './resources/best-practices.js';
import { isRecord, isString, isBoolean, isStringArray } from './types/index.js';

// Create the server (using Server for advanced request handling)
// eslint-disable-next-line @typescript-eslint/no-deprecated
const server = new Server(
  {
    name: 'tealium-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Define tools
const tools = [
  {
    name: 'validate_data_layer',
    description:
      'Validates a Tealium data layer object against schemas and best practices. Returns errors, warnings, and suggestions for improvement.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        dataLayer: {
          type: 'object',
          description: 'The data layer JSON object to validate',
        },
        schemaUri: {
          type: 'string',
          description:
            'Schema to validate against (tealium://schema/standard, tealium://schema/ecommerce, or tealium://schema/hotels)',
          default: 'tealium://schema/standard',
        },
        strictMode: {
          type: 'boolean',
          description: 'When true, treats warnings as errors',
          default: false,
        },
      },
      required: ['dataLayer'],
    },
  },
  {
    name: 'generate_documentation',
    description:
      'Generates documentation from a data layer structure or tracking specification. Outputs Markdown or JSON Schema format.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        dataLayer: {
          type: 'object',
          description: 'A data layer object to document',
        },
        spec: {
          type: 'object',
          description: 'A tracking specification object with variables and events',
        },
        format: {
          type: 'string',
          enum: ['markdown', 'json-schema'],
          description: 'Output format',
          default: 'markdown',
        },
      },
    },
  },
  {
    name: 'debug_data_layer',
    description:
      'Analyzes a data layer for common issues, missing variables, type mismatches, and provides recommendations. Perfect for troubleshooting tracking issues.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        dataLayer: {
          type: 'object',
          description: 'The data layer JSON to debug',
        },
        checkPoints: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific areas to focus on (e.g., "ecommerce", "loyalty", "search")',
        },
      },
      required: ['dataLayer'],
    },
  },
  {
    name: 'generate_code',
    description:
      'Generates TypeScript or JavaScript code from a tracking specification or data layer. Includes type definitions, helper functions, and event tracking code.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        spec: {
          type: 'object',
          description: 'Tracking specification with variables and events',
        },
        dataLayer: {
          type: 'object',
          description: 'Data layer object to generate types from',
        },
        language: {
          type: 'string',
          enum: ['typescript', 'javascript'],
          description: 'Target language',
          default: 'typescript',
        },
        includeHelpers: {
          type: 'boolean',
          description: 'Include helper functions like trackEvent()',
          default: true,
        },
      },
    },
  },
  {
    name: 'parse_tracking_spec',
    description:
      'Parses tracking specifications from CSV or JSON format (e.g., exported from Google Sheets or Excel). Normalizes the data into a structured format.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        content: {
          type: 'string',
          description: 'CSV or JSON content to parse',
        },
        format: {
          type: 'string',
          enum: ['csv', 'json', 'auto'],
          description: 'Input format (auto-detected if not specified)',
          default: 'auto',
        },
        hasHeader: {
          type: 'boolean',
          description: 'For CSV: whether the first row is a header',
          default: true,
        },
      },
      required: ['content'],
    },
  },
];

// Type-safe argument extraction helper
function getArg<T>(
  args: Record<string, unknown>,
  key: string,
  guard: (v: unknown) => v is T
): T | undefined {
  const value = args[key];
  return guard(value) ? value : undefined;
}

// Literal value validators
const DOC_FORMATS = ['markdown', 'json-schema'] as const;
const CODE_LANGUAGES = ['typescript', 'javascript'] as const;
const PARSE_FORMATS = ['csv', 'json', 'auto'] as const;

type DocFormat = (typeof DOC_FORMATS)[number];
type CodeLanguage = (typeof CODE_LANGUAGES)[number];
type ParseFormat = (typeof PARSE_FORMATS)[number];

function isOneOf<T extends string>(values: readonly T[]): (value: unknown) => value is T {
  const set = new Set<string>(values);
  return (value: unknown): value is T => typeof value === 'string' && set.has(value);
}

const isDocFormat = isOneOf(DOC_FORMATS);
const isCodeLanguage = isOneOf(CODE_LANGUAGES);
const isParseFormat = isOneOf(PARSE_FORMATS);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, () => ({
  tools,
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, (request) => {
  const { name, arguments: rawArgs } = request.params;
  const args: Record<string, unknown> = isRecord(rawArgs) ? rawArgs : {};

  try {
    switch (name) {
      case 'validate_data_layer': {
        const dataLayer = args.dataLayer;
        const schemaUri = getArg(args, 'schemaUri', isString) ?? 'tealium://schema/standard';
        const strictMode = getArg(args, 'strictMode', isBoolean) ?? false;

        const result = validateDataLayer({ dataLayer, schemaUri, strictMode });
        return {
          content: [{ type: 'text', text: formatValidationResult(result) }],
        };
      }

      case 'generate_documentation': {
        const dataLayer = getArg(args, 'dataLayer', isRecord);
        const spec = getArg(args, 'spec', isRecord);
        const format: DocFormat = getArg(args, 'format', isDocFormat) ?? 'markdown';

        const doc = generateDocumentation({ dataLayer, spec, format });
        return {
          content: [{ type: 'text', text: doc }],
        };
      }

      case 'debug_data_layer': {
        const dataLayer = args.dataLayer;
        const checkPoints = getArg(args, 'checkPoints', isStringArray) ?? [];

        const result = debugDataLayer({ dataLayer, checkPoints });
        return {
          content: [{ type: 'text', text: formatDebugResult(result) }],
        };
      }

      case 'generate_code': {
        const spec = getArg(args, 'spec', isRecord);
        const dataLayer = getArg(args, 'dataLayer', isRecord);
        const language: CodeLanguage = getArg(args, 'language', isCodeLanguage) ?? 'typescript';
        const includeHelpers = getArg(args, 'includeHelpers', isBoolean) ?? true;

        const code = generateCode({ spec, dataLayer, language, includeHelpers });
        return {
          content: [{ type: 'text', text: `\`\`\`${code.language}\n${code.code}\n\`\`\`` }],
        };
      }

      case 'parse_tracking_spec': {
        const content = getArg(args, 'content', isString);
        if (content === undefined) {
          return {
            content: [{ type: 'text', text: 'Error: content is required' }],
            isError: true,
          };
        }

        const format: ParseFormat = getArg(args, 'format', isParseFormat) ?? 'auto';
        const hasHeader = getArg(args, 'hasHeader', isBoolean) ?? true;

        const spec = parseTrackingSpec({ content, format, hasHeader });
        return {
          content: [
            {
              type: 'text',
              text:
                formatParsedSpec(spec) + '\n\n```json\n' + JSON.stringify(spec, null, 2) + '\n```',
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error: unknown) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Define resources
const resources = [
  ...listSchemas().map((s) => ({
    uri: s.uri,
    name: s.name,
    description: s.description,
    mimeType: 'application/json',
  })),
  ...listTemplates().map((t) => ({
    uri: t.uri,
    name: t.name,
    description: t.description,
    mimeType: 'text/javascript',
  })),
  {
    uri: 'tealium://best-practices',
    name: 'Tealium Best Practices',
    description: 'Best practices guide for Tealium data layer implementation',
    mimeType: 'text/markdown',
  },
];

// Handle resource listing
server.setRequestHandler(ListResourcesRequestSchema, () => ({
  resources,
}));

// Handle resource reading
server.setRequestHandler(ReadResourceRequestSchema, (request) => {
  const { uri } = request.params;

  // Check schemas
  if (uri.startsWith('tealium://schema/')) {
    const schema: object | undefined = schemas[uri];
    if (schema !== undefined) {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(schema, null, 2),
          },
        ],
      };
    }
  }

  // Check templates
  if (uri.startsWith('tealium://templates/')) {
    const template: string | undefined = templates[uri];
    if (template !== undefined) {
      return {
        contents: [
          {
            uri,
            mimeType: 'text/javascript',
            text: template,
          },
        ],
      };
    }
  }

  // Best practices
  if (uri === 'tealium://best-practices') {
    return {
      contents: [
        {
          uri,
          mimeType: 'text/markdown',
          text: bestPractices,
        },
      ],
    };
  }

  throw new Error(`Resource not found: ${uri}`);
});

// Start the server
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Tealium MCP Server started');
}

main().catch((error: unknown) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
