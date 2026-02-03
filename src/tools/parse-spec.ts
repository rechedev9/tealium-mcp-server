import type { TrackingSpec, TrackingVariable, TrackingEvent, Result } from '../types/index.js';
import { success, failure, isRecord, isString } from '../types/index.js';
import { ParseError } from '../types/errors.js';

export interface ParseTrackingSpecArgs {
  readonly content: string;
  readonly format?: 'csv' | 'json' | 'auto';
  readonly hasHeader?: boolean;
}

export function parseTrackingSpec(args: ParseTrackingSpecArgs): TrackingSpec {
  const result = parseTrackingSpecSafe(args);
  if (result.success) {
    return result.data;
  }
  throw result.error;
}

export function parseTrackingSpecSafe(
  args: ParseTrackingSpecArgs
): Result<TrackingSpec, ParseError> {
  const { content, format = 'auto', hasHeader = true } = args;

  // Detect format if auto
  const detectedFormat = format === 'auto' ? detectFormat(content) : format;

  if (detectedFormat === 'json') {
    return parseJsonSpec(content);
  }

  return parseCsvSpec(content, hasHeader);
}

function detectFormat(content: string): 'csv' | 'json' {
  const trimmed = content.trim();

  // Check if it starts with { or [ (JSON)
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return 'json';
  }

  return 'csv';
}

function parseJsonSpec(content: string): Result<TrackingSpec, ParseError> {
  try {
    const parsed: unknown = JSON.parse(content);

    // If it's already in TrackingSpec format
    if (
      isRecord(parsed) &&
      isString(parsed.name) &&
      (parsed.variables !== undefined || parsed.events !== undefined)
    ) {
      return success(normalizeSpec(parsed));
    }

    // If it's an array of variables
    if (Array.isArray(parsed)) {
      return success({
        name: 'Imported Specification',
        variables: parsed.map((item: unknown) => normalizeVariable(isRecord(item) ? item : {})),
        events: [],
      });
    }

    // If it's a flat object (data layer example)
    if (isRecord(parsed)) {
      return success(inferSpecFromDataLayer(parsed));
    }

    return failure(new ParseError('Invalid JSON structure', 'json'));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return failure(new ParseError(`Failed to parse JSON: ${message}`, 'json'));
  }
}

function parseCsvSpec(content: string, hasHeader: boolean): Result<TrackingSpec, ParseError> {
  const lines = content.split('\n').filter((line) => line.trim() !== '');

  if (lines.length === 0) {
    return failure(new ParseError('CSV content is empty', 'csv'));
  }

  const variables: TrackingVariable[] = [];
  const events: TrackingEvent[] = [];

  // Parse header to determine column mapping
  const headerMap: Record<string, number> = {};

  if (hasHeader) {
    const headerLine = lines[0];
    if (headerLine === undefined) {
      return failure(new ParseError('CSV header line is missing', 'csv'));
    }

    const headers = parseCSVLine(headerLine);

    // Map common header names to our format
    const headerMappings: Record<string, readonly string[]> = {
      name: ['name', 'variable', 'variable_name', 'variablename', 'field', 'property'],
      description: ['description', 'desc', 'definition', 'notes', 'comment'],
      type: ['type', 'datatype', 'data_type', 'format'],
      required: ['required', 'mandatory', 'is_required', 'isrequired'],
      example: ['example', 'sample', 'sample_value', 'samplevalue'],
      allowedValues: ['allowed_values', 'allowedvalues', 'values', 'enum', 'options'],
      event: ['event', 'event_name', 'eventname', 'trigger'],
    };

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      if (header === undefined) continue;
      const normalizedHeader = header.toLowerCase().trim();

      for (const [key, aliases] of Object.entries(headerMappings)) {
        if (aliases.includes(normalizedHeader)) {
          headerMap[key] = i;
          break;
        }
      }
    }

    // Process data lines
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line === undefined) continue;

      const values = parseCSVLine(line);
      const variable = extractVariable(values, headerMap);

      if (variable !== null) {
        variables.push(variable);

        // Check if this line also defines an event
        const eventIndex = headerMap.event;
        if (eventIndex !== undefined) {
          const eventName = values[eventIndex]?.trim();
          if (eventName !== undefined && eventName !== '') {
            let existingEvent = events.find((e) => e.name === eventName);
            if (existingEvent === undefined) {
              const newEvent: TrackingEvent = {
                name: eventName,
                description: `Event: ${eventName}`,
                trigger: 'User action',
                variables: [],
              };
              events.push(newEvent);
              existingEvent = newEvent;
            }
            // Find the event index and update it with the new variable
            const eventIndex = events.findIndex((e) => e.name === eventName);
            if (eventIndex !== -1) {
              const oldEvent = events[eventIndex];
              if (oldEvent !== undefined) {
                events[eventIndex] = {
                  ...oldEvent,
                  variables: [...oldEvent.variables, variable],
                };
              }
            }
          }
        }
      }
    }
  } else {
    // No header - assume columns are: name, type, required, description
    for (const line of lines) {
      const values = parseCSVLine(line);

      if (values.length >= 2) {
        const name = values[0]?.trim() ?? '';
        const typeStr = values[1]?.trim() ?? 'string';
        const requiredStr = values[2]?.toLowerCase().trim() ?? '';
        const description = values[3]?.trim() ?? '';

        variables.push({
          name,
          type: normalizeType(typeStr),
          required: requiredStr === 'true' || requiredStr === 'yes',
          description,
        });
      }
    }
  }

  return success({
    name: 'Imported Tracking Specification',
    variables,
    events,
  });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === undefined) continue;

    if (char === '"') {
      const nextChar = line[i + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === ',' || char === ';' || char === '\t') && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function extractVariable(
  values: readonly string[],
  headerMap: Record<string, number>
): TrackingVariable | null {
  const nameIndex = headerMap.name;
  const name = nameIndex !== undefined ? values[nameIndex]?.trim() : values[0]?.trim();

  if (name === undefined || name === '') {
    return null;
  }

  const descIndex = headerMap.description;
  const typeIndex = headerMap.type;
  const requiredIndex = headerMap.required;
  const exampleIndex = headerMap.example;
  const allowedIndex = headerMap.allowedValues;

  const description = descIndex !== undefined ? (values[descIndex]?.trim() ?? '') : '';
  const typeStr = typeIndex !== undefined ? (values[typeIndex]?.trim() ?? 'string') : 'string';
  const requiredStr =
    requiredIndex !== undefined ? (values[requiredIndex]?.toLowerCase().trim() ?? '') : '';
  const exampleStr = exampleIndex !== undefined ? values[exampleIndex]?.trim() : undefined;
  const allowedValues = parseAllowedValues(
    allowedIndex !== undefined ? values[allowedIndex] : undefined
  );

  return {
    name,
    description,
    type: normalizeType(typeStr),
    required: ['true', 'yes', '1', 'required'].includes(requiredStr),
    ...(exampleStr !== undefined && exampleStr !== '' ? { example: exampleStr } : {}),
    ...(allowedValues !== undefined ? { allowedValues } : {}),
  };
}

function normalizeType(type: string): 'string' | 'number' | 'boolean' | 'array' | 'object' {
  const lower = type.toLowerCase();

  if (['string', 'text', 'varchar', 'char'].includes(lower)) return 'string';
  if (['number', 'int', 'integer', 'float', 'double', 'decimal', 'numeric'].includes(lower))
    return 'number';
  if (['boolean', 'bool', 'bit'].includes(lower)) return 'boolean';
  if (['array', 'list', 'collection'].includes(lower)) return 'array';
  if (['object', 'json', 'map', 'dict'].includes(lower)) return 'object';

  return 'string';
}

function parseAllowedValues(value: string | undefined): readonly string[] | undefined {
  if (value === undefined || value === '') return undefined;

  const trimmed = value.trim();

  // Try JSON array
  if (trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((v: unknown) => String(v));
      }
    } catch {
      // Fall through to other parsing
    }
  }

  // Try pipe-separated
  if (trimmed.includes('|')) {
    return trimmed.split('|').map((v) => v.trim());
  }

  // Try comma-separated (if not already split by CSV parser)
  if (trimmed.includes(',')) {
    return trimmed.split(',').map((v) => v.trim());
  }

  return [trimmed];
}

function normalizeSpec(parsed: Record<string, unknown>): TrackingSpec {
  const name = isString(parsed.name) ? parsed.name : 'Unnamed Specification';
  const rawVariables = Array.isArray(parsed.variables) ? parsed.variables : [];
  const rawEvents = Array.isArray(parsed.events) ? parsed.events : [];

  return {
    name,
    ...(isString(parsed.version) ? { version: parsed.version } : {}),
    ...(isString(parsed.description) ? { description: parsed.description } : {}),
    variables: rawVariables.map((v: unknown) => normalizeVariable(isRecord(v) ? v : {})),
    events: rawEvents.map((e: unknown) => normalizeEvent(isRecord(e) ? e : {})),
  };
}

function normalizeVariable(v: Record<string, unknown>): TrackingVariable {
  const name = isString(v.name) ? v.name : '';
  const description = isString(v.description) ? v.description : '';
  const typeStr = isString(v.type) ? v.type : 'string';
  const required = v.required === true;
  const example = v.example;
  const hasValidExample =
    typeof example === 'string' || typeof example === 'number' || typeof example === 'boolean';

  return {
    name,
    description,
    type: normalizeType(typeStr),
    required,
    ...(hasValidExample ? { example } : {}),
    ...(Array.isArray(v.allowedValues)
      ? {
          allowedValues: v.allowedValues.map((val: unknown) =>
            typeof val === 'number' ? val : String(val)
          ),
        }
      : {}),
    ...(isString(v.format) ? { format: v.format } : {}),
  };
}

function normalizeEvent(e: Record<string, unknown>): TrackingEvent {
  const name = isString(e.name) ? e.name : '';
  const description = isString(e.description) ? e.description : '';
  const trigger = isString(e.trigger) ? e.trigger : '';
  const rawVariables = Array.isArray(e.variables) ? e.variables : [];

  return {
    name,
    description,
    trigger,
    variables: rawVariables.map((v: unknown) => normalizeVariable(isRecord(v) ? v : {})),
  };
}

function inferType(value: unknown): 'string' | 'number' | 'boolean' | 'array' | 'object' {
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (isRecord(value)) return 'object';
  return 'string';
}

function extractVariablesFromObject(obj: unknown, path: string): readonly TrackingVariable[] {
  if (!isRecord(obj)) return [];

  return Object.entries(obj).flatMap(([key, value]) => {
    const currentPath = path !== '' ? `${path}.${key}` : key;

    if (isRecord(value)) {
      return extractVariablesFromObject(value, currentPath);
    }

    const isPrimitive =
      typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

    return [
      {
        name: currentPath,
        description: 'Inferred from data layer',
        type: inferType(value),
        required: false,
        ...(isPrimitive ? { example: value } : {}),
      },
    ];
  });
}

function inferSpecFromDataLayer(dataLayer: Record<string, unknown>): TrackingSpec {
  return {
    name: 'Inferred Specification',
    description: 'Auto-generated from data layer structure',
    variables: extractVariablesFromObject(dataLayer, ''),
    events: [],
  };
}

export function formatParsedSpec(spec: TrackingSpec): string {
  const lines: string[] = [];

  lines.push(`# ${spec.name}`);
  if (spec.version !== undefined) lines.push(`**Version:** ${spec.version}`);
  if (spec.description !== undefined) lines.push(`\n${spec.description}`);
  lines.push('');

  lines.push(`## Variables (${String(spec.variables.length)})`);
  lines.push('');

  if (spec.variables.length > 0) {
    lines.push('| Variable | Type | Required | Description |');
    lines.push('|----------|------|----------|-------------|');

    for (const v of spec.variables) {
      lines.push(`| \`${v.name}\` | ${v.type} | ${v.required ? '✅' : '❌'} | ${v.description} |`);
    }
  }

  if (spec.events.length > 0) {
    lines.push('');
    lines.push(`## Events (${String(spec.events.length)})`);
    lines.push('');

    for (const event of spec.events) {
      lines.push(`### ${event.name}`);
      lines.push(`- **Trigger:** ${event.trigger}`);
      lines.push(`- **Variables:** ${String(event.variables.length)}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}
