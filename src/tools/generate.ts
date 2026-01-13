import type { TrackingSpec, TrackingVariable, GeneratedCode } from '../types/index.js';

export interface GenerateCodeArgs {
  spec?: TrackingSpec;
  dataLayer?: Record<string, unknown>;
  language?: 'typescript' | 'javascript';
  includeHelpers?: boolean;
}

export function generateCode(args: GenerateCodeArgs): GeneratedCode {
  const { spec, dataLayer, language = 'typescript', includeHelpers = true } = args;

  if (spec) {
    return generateCodeFromSpec(spec, language, includeHelpers);
  }

  if (dataLayer) {
    return generateCodeFromDataLayer(dataLayer, language, includeHelpers);
  }

  return {
    code: '// No specification or data layer provided',
    language,
  };
}

function generateCodeFromSpec(
  spec: TrackingSpec,
  language: 'typescript' | 'javascript',
  includeHelpers: boolean
): GeneratedCode {
  const lines: string[] = [];
  const imports: string[] = [];

  if (language === 'typescript') {
    // Generate interfaces
    lines.push('// Auto-generated TypeScript interfaces');
    lines.push(`// Generated from: ${spec.name}`);
    lines.push('');

    // Group variables by section
    const sections = groupVariablesBySection(spec.variables);

    for (const [section, variables] of Object.entries(sections)) {
      lines.push(`export interface ${capitalizeFirst(section)}Data {`);
      for (const variable of variables) {
        const optional = variable.required ? '' : '?';
        const tsType = toTypeScriptType(variable.type);
        lines.push(`  /** ${variable.description} */`);
        lines.push(`  ${variable.name.split('.').pop()}${optional}: ${tsType};`);
      }
      lines.push('}');
      lines.push('');
    }

    // Generate main data layer interface
    lines.push('export interface DataLayer {');
    for (const section of Object.keys(sections)) {
      lines.push(`  ${section}?: ${capitalizeFirst(section)}Data;`);
    }
    lines.push('}');
    lines.push('');

    // Generate event types
    if (spec.events.length > 0) {
      lines.push('// Event types');
      lines.push(`export type EventName = ${spec.events.map(e => `'${e.name}'`).join(' | ')};`);
      lines.push('');
    }
  }

  // Generate initialization code
  lines.push(`// Data layer initialization`);
  if (language === 'typescript') {
    lines.push('declare global {');
    lines.push('  interface Window {');
    lines.push('    utag_data: DataLayer;');
    lines.push('    utag?: {');
    lines.push('      link: (data: Record<string, unknown>) => void;');
    lines.push('      view: (data: Record<string, unknown>) => void;');
    lines.push('    };');
    lines.push('  }');
    lines.push('}');
    lines.push('');
  }

  lines.push('window.utag_data = window.utag_data || {};');
  lines.push('');

  // Generate helper functions if requested
  if (includeHelpers) {
    lines.push(generateHelperFunctions(spec, language));
  }

  // Generate event tracking functions
  if (spec.events.length > 0) {
    lines.push('// Event tracking functions');
    lines.push('');

    for (const event of spec.events) {
      lines.push(generateEventFunction(event, language));
      lines.push('');
    }
  }

  return {
    code: lines.join('\n'),
    language,
    imports,
    filename: language === 'typescript' ? 'data-layer.ts' : 'data-layer.js',
  };
}

function generateCodeFromDataLayer(
  dataLayer: Record<string, unknown>,
  language: 'typescript' | 'javascript',
  includeHelpers: boolean
): GeneratedCode {
  const lines: string[] = [];

  if (language === 'typescript') {
    // Infer types from data layer
    lines.push('// Auto-generated TypeScript interfaces from data layer');
    lines.push('');

    for (const [key, value] of Object.entries(dataLayer)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        lines.push(generateInterfaceFromObject(key, value as Record<string, unknown>));
        lines.push('');
      }
    }

    // Main interface
    lines.push('export interface DataLayer {');
    for (const key of Object.keys(dataLayer)) {
      lines.push(`  ${key}?: ${capitalizeFirst(key)}Data;`);
    }
    lines.push('}');
    lines.push('');
  }

  // Generate initialization with current values
  lines.push('// Data layer initialization');
  lines.push(`window.utag_data = ${JSON.stringify(dataLayer, null, 2)};`);
  lines.push('');

  if (includeHelpers) {
    lines.push(generateBasicHelpers(language));
  }

  return {
    code: lines.join('\n'),
    language,
    filename: language === 'typescript' ? 'data-layer.ts' : 'data-layer.js',
  };
}

function groupVariablesBySection(variables: TrackingVariable[]): Record<string, TrackingVariable[]> {
  const sections: Record<string, TrackingVariable[]> = {};

  for (const variable of variables) {
    const parts = variable.name.split('.');
    const section = parts[0];

    if (!sections[section]) {
      sections[section] = [];
    }
    sections[section].push(variable);
  }

  return sections;
}

function toTypeScriptType(type: string): string {
  switch (type) {
    case 'string': return 'string';
    case 'number': return 'number';
    case 'boolean': return 'boolean';
    case 'array': return 'unknown[]';
    case 'object': return 'Record<string, unknown>';
    default: return 'unknown';
  }
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateInterfaceFromObject(name: string, obj: Record<string, unknown>): string {
  const lines: string[] = [];
  lines.push(`export interface ${capitalizeFirst(name)}Data {`);

  for (const [key, value] of Object.entries(obj)) {
    const tsType = inferTypeScriptType(value);
    lines.push(`  ${key}?: ${tsType};`);
  }

  lines.push('}');
  return lines.join('\n');
}

function inferTypeScriptType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) {
    if (value.length === 0) return 'unknown[]';
    return `${inferTypeScriptType(value[0])}[]`;
  }
  if (typeof value === 'object') return 'Record<string, unknown>';
  return typeof value;
}

function generateHelperFunctions(spec: TrackingSpec, language: 'typescript' | 'javascript'): string {
  const typeAnnotations = language === 'typescript';
  const lines: string[] = [];

  lines.push('// Helper functions');
  lines.push('');

  // Track event function
  if (typeAnnotations) {
    lines.push('export function trackEvent(');
    lines.push('  eventName: EventName,');
    lines.push('  eventData?: Record<string, unknown>');
    lines.push('): void {');
  } else {
    lines.push('function trackEvent(eventName, eventData) {');
  }
  lines.push('  const payload = {');
  lines.push('    event: {');
  lines.push('      eventName,');
  lines.push('      ...eventData,');
  lines.push('    },');
  lines.push('    ...window.utag_data,');
  lines.push('  };');
  lines.push('');
  lines.push('  if (window.utag?.link) {');
  lines.push('    window.utag.link(payload);');
  lines.push('  } else {');
  lines.push("    console.warn('Tealium not loaded, event queued:', eventName);");
  lines.push('  }');
  lines.push('}');
  lines.push('');

  // Update data layer function
  if (typeAnnotations) {
    lines.push('export function updateDataLayer(updates: Partial<DataLayer>): void {');
  } else {
    lines.push('function updateDataLayer(updates) {');
  }
  lines.push('  window.utag_data = {');
  lines.push('    ...window.utag_data,');
  lines.push('    ...updates,');
  lines.push('  };');
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

function generateBasicHelpers(language: 'typescript' | 'javascript'): string {
  const lines: string[] = [];
  const typeAnnotations = language === 'typescript';

  lines.push('// Helper functions');
  lines.push('');

  if (typeAnnotations) {
    lines.push('export function trackEvent(');
    lines.push('  eventName: string,');
    lines.push('  eventData?: Record<string, unknown>');
    lines.push('): void {');
  } else {
    lines.push('function trackEvent(eventName, eventData) {');
  }
  lines.push('  if (window.utag?.link) {');
  lines.push('    window.utag.link({');
  lines.push('      event: { eventName, ...eventData },');
  lines.push('      ...window.utag_data,');
  lines.push('    });');
  lines.push('  }');
  lines.push('}');

  return lines.join('\n');
}

function generateEventFunction(
  event: { name: string; description: string; trigger: string; variables: TrackingVariable[] },
  language: 'typescript' | 'javascript'
): string {
  const lines: string[] = [];
  const funcName = toCamelCase(`track_${event.name.replace(/\./g, '_')}`);
  const typeAnnotations = language === 'typescript';

  // Build parameter interface for TypeScript
  const requiredVars = event.variables.filter(v => v.required);
  const optionalVars = event.variables.filter(v => !v.required);

  lines.push(`/**`);
  lines.push(` * ${event.description}`);
  lines.push(` * Trigger: ${event.trigger}`);
  lines.push(` */`);

  if (typeAnnotations && event.variables.length > 0) {
    lines.push(`export function ${funcName}(params: {`);
    for (const v of requiredVars) {
      lines.push(`  ${v.name.split('.').pop()}: ${toTypeScriptType(v.type)};`);
    }
    for (const v of optionalVars) {
      lines.push(`  ${v.name.split('.').pop()}?: ${toTypeScriptType(v.type)};`);
    }
    lines.push('}): void {');
  } else if (event.variables.length > 0) {
    lines.push(`function ${funcName}(params) {`);
  } else {
    lines.push(`function ${funcName}()${typeAnnotations ? ': void' : ''} {`);
  }

  lines.push(`  trackEvent('${event.name}'${event.variables.length > 0 ? ', params' : ''});`);
  lines.push('}');

  return lines.join('\n');
}

function toCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));
}
