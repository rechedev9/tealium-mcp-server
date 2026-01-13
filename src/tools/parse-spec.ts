import type { TrackingSpec, TrackingVariable, TrackingEvent } from '../types/index.js';

export interface ParseTrackingSpecArgs {
  content: string;
  format?: 'csv' | 'json' | 'auto';
  hasHeader?: boolean;
}

export function parseTrackingSpec(args: ParseTrackingSpecArgs): TrackingSpec {
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

function parseJsonSpec(content: string): TrackingSpec {
  try {
    const parsed = JSON.parse(content);

    // If it's already in TrackingSpec format
    if (parsed.name && (parsed.variables || parsed.events)) {
      return normalizeSpec(parsed);
    }

    // If it's an array of variables
    if (Array.isArray(parsed)) {
      return {
        name: 'Imported Specification',
        variables: parsed.map(normalizeVariable),
        events: [],
      };
    }

    // If it's a flat object (data layer example)
    return inferSpecFromDataLayer(parsed);
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function parseCsvSpec(content: string, hasHeader: boolean): TrackingSpec {
  const lines = content.split('\n').filter(line => line.trim());

  if (lines.length === 0) {
    throw new Error('CSV content is empty');
  }

  const variables: TrackingVariable[] = [];
  const events: TrackingEvent[] = [];

  // Parse header to determine column mapping
  let headerMap: Record<string, number> = {};

  if (hasHeader) {
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine);

    // Map common header names to our format
    const headerMappings: Record<string, string[]> = {
      name: ['name', 'variable', 'variable_name', 'variablename', 'field', 'property'],
      description: ['description', 'desc', 'definition', 'notes', 'comment'],
      type: ['type', 'datatype', 'data_type', 'format'],
      required: ['required', 'mandatory', 'is_required', 'isrequired'],
      example: ['example', 'sample', 'sample_value', 'samplevalue'],
      allowedValues: ['allowed_values', 'allowedvalues', 'values', 'enum', 'options'],
      event: ['event', 'event_name', 'eventname', 'trigger'],
    };

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toLowerCase().trim();

      for (const [key, aliases] of Object.entries(headerMappings)) {
        if (aliases.includes(header)) {
          headerMap[key] = i;
          break;
        }
      }
    }

    // Process data lines
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);

      const variable = extractVariable(values, headerMap);
      if (variable) {
        variables.push(variable);

        // Check if this line also defines an event
        if (headerMap.event !== undefined) {
          const eventName = values[headerMap.event]?.trim();
          if (eventName) {
            let existingEvent = events.find(e => e.name === eventName);
            if (!existingEvent) {
              existingEvent = {
                name: eventName,
                description: `Event: ${eventName}`,
                trigger: 'User action',
                variables: [],
              };
              events.push(existingEvent);
            }
            existingEvent.variables.push(variable);
          }
        }
      }
    }
  } else {
    // No header - assume columns are: name, type, required, description
    for (const line of lines) {
      const values = parseCSVLine(line);

      if (values.length >= 2) {
        variables.push({
          name: values[0]?.trim() || '',
          type: normalizeType(values[1]?.trim() || 'string'),
          required: values[2]?.toLowerCase().trim() === 'true' || values[2]?.toLowerCase().trim() === 'yes',
          description: values[3]?.trim() || '',
        });
      }
    }
  }

  return {
    name: 'Imported Tracking Specification',
    variables,
    events,
  };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
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
  values: string[],
  headerMap: Record<string, number>
): TrackingVariable | null {
  const name = headerMap.name !== undefined ? values[headerMap.name]?.trim() : values[0]?.trim();

  if (!name) {
    return null;
  }

  return {
    name,
    description: headerMap.description !== undefined
      ? values[headerMap.description]?.trim() || ''
      : '',
    type: normalizeType(
      headerMap.type !== undefined
        ? values[headerMap.type]?.trim() || 'string'
        : 'string'
    ),
    required: headerMap.required !== undefined
      ? ['true', 'yes', '1', 'required'].includes(values[headerMap.required]?.toLowerCase().trim() || '')
      : false,
    example: headerMap.example !== undefined
      ? values[headerMap.example]?.trim()
      : undefined,
    allowedValues: headerMap.allowedValues !== undefined
      ? parseAllowedValues(values[headerMap.allowedValues])
      : undefined,
  };
}

function normalizeType(type: string): 'string' | 'number' | 'boolean' | 'array' | 'object' {
  const lower = type.toLowerCase();

  if (['string', 'text', 'varchar', 'char'].includes(lower)) return 'string';
  if (['number', 'int', 'integer', 'float', 'double', 'decimal', 'numeric'].includes(lower)) return 'number';
  if (['boolean', 'bool', 'bit'].includes(lower)) return 'boolean';
  if (['array', 'list', 'collection'].includes(lower)) return 'array';
  if (['object', 'json', 'map', 'dict'].includes(lower)) return 'object';

  return 'string';
}

function parseAllowedValues(value: string | undefined): string[] | undefined {
  if (!value) return undefined;

  const trimmed = value.trim();

  // Try JSON array
  if (trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Fall through to other parsing
    }
  }

  // Try pipe-separated
  if (trimmed.includes('|')) {
    return trimmed.split('|').map(v => v.trim());
  }

  // Try comma-separated (if not already split by CSV parser)
  if (trimmed.includes(',')) {
    return trimmed.split(',').map(v => v.trim());
  }

  return [trimmed];
}

function normalizeSpec(parsed: Partial<TrackingSpec>): TrackingSpec {
  return {
    name: parsed.name || 'Unnamed Specification',
    version: parsed.version,
    description: parsed.description,
    variables: (parsed.variables || []).map(normalizeVariable),
    events: (parsed.events || []).map(normalizeEvent),
  };
}

function normalizeVariable(v: Partial<TrackingVariable>): TrackingVariable {
  return {
    name: v.name || '',
    description: v.description || '',
    type: normalizeType(v.type || 'string'),
    required: v.required || false,
    example: v.example,
    allowedValues: v.allowedValues,
    format: v.format,
  };
}

function normalizeEvent(e: Partial<TrackingEvent>): TrackingEvent {
  return {
    name: e.name || '',
    description: e.description || '',
    trigger: e.trigger || '',
    variables: (e.variables || []).map(normalizeVariable),
  };
}

function inferSpecFromDataLayer(dataLayer: Record<string, unknown>): TrackingSpec {
  const variables: TrackingVariable[] = [];

  function extractVariables(obj: unknown, path: string): void {
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;

        if (value && typeof value === 'object' && !Array.isArray(value)) {
          extractVariables(value, currentPath);
        } else {
          variables.push({
            name: currentPath,
            description: `Inferred from data layer`,
            type: inferType(value),
            required: false,
            example: typeof value === 'object' ? undefined : value as string | number | boolean,
          });
        }
      }
    }
  }

  function inferType(value: unknown): 'string' | 'number' | 'boolean' | 'array' | 'object' {
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'object' && value !== null) return 'object';
    return 'string';
  }

  extractVariables(dataLayer, '');

  return {
    name: 'Inferred Specification',
    description: 'Auto-generated from data layer structure',
    variables,
    events: [],
  };
}

export function formatParsedSpec(spec: TrackingSpec): string {
  const lines: string[] = [];

  lines.push(`# ${spec.name}`);
  if (spec.version) lines.push(`**Version:** ${spec.version}`);
  if (spec.description) lines.push(`\n${spec.description}`);
  lines.push('');

  lines.push(`## Variables (${spec.variables.length})`);
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
    lines.push(`## Events (${spec.events.length})`);
    lines.push('');

    for (const event of spec.events) {
      lines.push(`### ${event.name}`);
      lines.push(`- **Trigger:** ${event.trigger}`);
      lines.push(`- **Variables:** ${event.variables.length}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}
