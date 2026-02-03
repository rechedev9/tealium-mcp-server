import type { TealiumDataLayer, TrackingSpec } from '../types/index.js';
import { isRecord, isTealiumDataLayer, isTrackingSpec, capitalizeFirst } from '../types/index.js';

export interface GenerateDocumentationArgs {
  readonly dataLayer?: unknown;
  readonly spec?: unknown;
  readonly format?: 'markdown' | 'json-schema';
}

export function generateDocumentation(args: GenerateDocumentationArgs): string {
  const { dataLayer, spec, format = 'markdown' } = args;

  if (spec !== undefined && isTrackingSpec(spec)) {
    return format === 'markdown'
      ? generateMarkdownFromSpec(spec)
      : generateJsonSchemaFromSpec(spec);
  }

  if (dataLayer !== undefined && isTealiumDataLayer(dataLayer)) {
    return format === 'markdown'
      ? generateMarkdownFromDataLayer(dataLayer)
      : generateJsonSchemaFromDataLayer(dataLayer);
  }

  return 'No valid data layer or specification provided';
}

function generateMarkdownFromSpec(spec: TrackingSpec): string {
  const lines: string[] = [];

  lines.push(`# ${spec.name}`);
  if (spec.version !== undefined) lines.push(`**Version:** ${spec.version}`);
  if (spec.description !== undefined) lines.push(`\n${spec.description}`);
  lines.push('');

  // Variables section
  if (spec.variables.length > 0) {
    lines.push('## Data Layer Variables');
    lines.push('');
    lines.push('| Variable | Type | Required | Description |');
    lines.push('|----------|------|----------|-------------|');

    for (const variable of spec.variables) {
      const required = variable.required ? '✅' : '❌';
      lines.push(
        `| \`${variable.name}\` | ${variable.type} | ${required} | ${variable.description} |`
      );
    }
    lines.push('');

    // Variable details
    lines.push('### Variable Details');
    lines.push('');

    for (const variable of spec.variables) {
      lines.push(`#### \`${variable.name}\``);
      lines.push(`- **Type:** ${variable.type}`);
      lines.push(`- **Required:** ${variable.required ? 'Yes' : 'No'}`);
      lines.push(`- **Description:** ${variable.description}`);
      if (variable.example !== undefined) {
        lines.push(`- **Example:** \`${JSON.stringify(variable.example)}\``);
      }
      if (variable.allowedValues !== undefined) {
        lines.push(
          `- **Allowed values:** ${variable.allowedValues.map((v) => `\`${String(v)}\``).join(', ')}`
        );
      }
      if (variable.format !== undefined) {
        lines.push(`- **Format:** ${variable.format}`);
      }
      lines.push('');
    }
  }

  // Events section
  if (spec.events.length > 0) {
    lines.push('## Events');
    lines.push('');

    for (const event of spec.events) {
      lines.push(`### ${event.name}`);
      lines.push(`**Trigger:** ${event.trigger}`);
      lines.push('');
      lines.push(event.description);
      lines.push('');

      if (event.variables.length > 0) {
        lines.push('#### Variables');
        lines.push('| Variable | Type | Required | Description |');
        lines.push('|----------|------|----------|-------------|');

        for (const variable of event.variables) {
          const required = variable.required ? '✅' : '❌';
          lines.push(
            `| \`${variable.name}\` | ${variable.type} | ${required} | ${variable.description} |`
          );
        }
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}

function generateMarkdownFromDataLayer(dataLayer: TealiumDataLayer): string {
  const lines: string[] = [];

  lines.push('# Data Layer Documentation');
  lines.push('');
  lines.push('*Auto-generated from data layer structure*');
  lines.push('');

  // Analyze structure
  for (const [section, value] of Object.entries(dataLayer)) {
    if (isRecord(value)) {
      lines.push(`## ${capitalizeFirst(section)} Data`);
      lines.push('');
      lines.push('| Variable | Type | Current Value |');
      lines.push('|----------|------|---------------|');

      for (const [key, val] of Object.entries(value)) {
        const type = getTypeString(val);
        const displayValue = formatValue(val);
        lines.push(`| \`${section}.${key}\` | ${type} | ${displayValue} |`);
      }
      lines.push('');
    }
  }

  // Generate example
  lines.push('## Example Data Layer');
  lines.push('');
  lines.push('```javascript');
  lines.push('window.utag_data = ' + JSON.stringify(dataLayer, null, 2) + ';');
  lines.push('```');

  return lines.join('\n');
}

function generateJsonSchemaFromSpec(spec: TrackingSpec): string {
  const schema: Record<string, unknown> = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: spec.name,
    description: spec.description,
    type: 'object',
    properties: {} as Record<string, unknown>,
    required: [] as string[],
  };

  const properties = schema.properties as Record<string, unknown>;
  const required = schema.required as string[];

  for (const variable of spec.variables) {
    const parts = variable.name.split('.');
    let current = properties;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (part === undefined) continue;

      if (current[part] === undefined) {
        current[part] = { type: 'object', properties: {} };
      }
      const currentObj = current[part];
      if (isRecord(currentObj) && isRecord(currentObj.properties)) {
        current = currentObj.properties;
      }
    }

    const lastPart = parts[parts.length - 1];
    if (lastPart === undefined) continue;

    const propDef: Record<string, unknown> = {
      type: variable.type,
      description: variable.description,
    };

    if (variable.allowedValues !== undefined) {
      propDef.enum = variable.allowedValues;
    }

    current[lastPart] = propDef;

    if (variable.required && parts.length === 1) {
      required.push(variable.name);
    }
  }

  return JSON.stringify(schema, null, 2);
}

function generateJsonSchemaFromDataLayer(dataLayer: TealiumDataLayer): string {
  const schema = inferSchemaFromObject(dataLayer, 'Data Layer');
  return JSON.stringify(schema, null, 2);
}

function inferSchemaFromObject(obj: unknown, title: string): Record<string, unknown> {
  if (obj === null) {
    return { type: 'null' };
  }

  if (Array.isArray(obj)) {
    const firstItem: unknown = obj[0];
    return {
      type: 'array',
      items: obj.length > 0 ? inferSchemaFromObject(firstItem, 'item') : {},
    };
  }

  if (isRecord(obj)) {
    const properties: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      properties[key] = inferSchemaFromObject(value, key);
    }
    return {
      type: 'object',
      title,
      properties,
    };
  }

  return { type: typeof obj };
}

function getTypeString(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '*empty*';
  if (typeof value === 'string')
    return value.length > 30 ? `"${value.slice(0, 30)}..."` : `"${value}"`;
  if (typeof value === 'object') return '*object*';
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '*unknown*';
}
