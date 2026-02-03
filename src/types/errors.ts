/**
 * Base error class for all Tealium MCP errors.
 */
export class TealiumError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'TealiumError';
    this.code = code;
  }
}

/**
 * Error thrown when validation fails.
 */
export class ValidationError extends TealiumError {
  readonly path: string;
  readonly value: unknown;

  constructor(message: string, path: string, value?: unknown) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.path = path;
    this.value = value;
  }
}

/**
 * Error thrown when parsing fails.
 */
export class ParseError extends TealiumError {
  readonly source: string;

  constructor(message: string, source: string) {
    super(message, 'PARSE_ERROR');
    this.name = 'ParseError';
    this.source = source;
  }
}

/**
 * Error thrown when schema validation fails.
 */
export class SchemaError extends TealiumError {
  readonly schemaUri: string;

  constructor(message: string, schemaUri: string) {
    super(message, 'SCHEMA_ERROR');
    this.name = 'SchemaError';
    this.schemaUri = schemaUri;
  }
}

/**
 * Error thrown when a tool receives invalid arguments.
 */
export class ToolArgumentError extends TealiumError {
  readonly toolName: string;
  readonly argumentName: string;

  constructor(toolName: string, argumentName: string, message: string) {
    super(message, 'TOOL_ARGUMENT_ERROR');
    this.name = 'ToolArgumentError';
    this.toolName = toolName;
    this.argumentName = argumentName;
  }
}
