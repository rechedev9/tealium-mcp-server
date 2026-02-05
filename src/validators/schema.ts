import Ajv from 'ajv';
import type { ErrorObject, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { standardSchema, ecommerceSchema, hotelSchema } from '../resources/schemas.js';
import type { ValidationResult, ValidationError, ValidationWarning } from '../types/index.js';

const ajv = new Ajv.default({ allErrors: true, verbose: true });
addFormats.default(ajv);

// Add compiled schemas
ajv.addSchema(standardSchema);
ajv.addSchema(ecommerceSchema);
ajv.addSchema(hotelSchema);

export function validateAgainstSchema(
  dataLayer: unknown,
  schemaUri = 'tealium://schema/standard'
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];

  // Get the validator
  const validate: ValidateFunction | undefined = ajv.getSchema(schemaUri);

  if (validate === undefined) {
    return {
      isValid: false,
      errors: [{ path: '', message: `Schema not found: ${schemaUri}`, value: schemaUri }],
      warnings: [],
      suggestions: [`Available schemas: standard, ecommerce, hotels`],
      summary: `Validation failed: Schema "${schemaUri}" not found`,
    };
  }

  // Run validation — validate() returns boolean | PromiseLike<any> from Ajv types
  const valid = validate(dataLayer);

  if (!valid && validate.errors !== undefined && validate.errors !== null) {
    for (const error of validate.errors) {
      const baseError = {
        path: error.instancePath === '' ? '/' : error.instancePath,
        message: formatAjvError(error),
        value: error.data,
      };

      const validationError: ValidationError =
        error.schema !== undefined
          ? { ...baseError, expected: stringifySchema(error.schema) }
          : baseError;

      errors.push(validationError);
    }
  }

  // Generate summary
  const summary = valid
    ? 'Data layer is valid'
    : `Found ${String(errors.length)} error(s) in data layer`;

  return {
    isValid: valid,
    errors,
    warnings,
    suggestions,
    summary,
  };
}

function stringifySchema(schema: unknown): string {
  if (schema === null) return 'null';
  if (typeof schema === 'object') return JSON.stringify(schema);
  if (typeof schema === 'string' || typeof schema === 'number' || typeof schema === 'boolean') {
    return String(schema);
  }
  return 'unknown';
}

function getParamString(params: Record<string, unknown>, key: string): string | undefined {
  const value = params[key];
  return typeof value === 'string' ? value : undefined;
}

function getParamNumber(params: Record<string, unknown>, key: string): number | undefined {
  const value = params[key];
  return typeof value === 'number' ? value : undefined;
}

function getParamArray(params: Record<string, unknown>, key: string): unknown[] | undefined {
  const value = params[key];
  return Array.isArray(value) ? value : undefined;
}

function formatAjvError(error: ErrorObject): string {
  const params: Record<string, unknown> = error.params;

  switch (error.keyword) {
    case 'required': {
      return `Missing required property: ${getParamString(params, 'missingProperty') ?? 'unknown'}`;
    }
    case 'type': {
      return `Expected ${getParamString(params, 'type') ?? 'unknown'}, got ${typeof error.data}`;
    }
    case 'enum': {
      const values = getParamArray(params, 'allowedValues');
      return `Value must be one of: ${values !== undefined ? values.join(', ') : 'unknown'}`;
    }
    case 'minLength': {
      return `String is too short (minimum ${String(getParamNumber(params, 'limit') ?? 0)} characters)`;
    }
    case 'pattern': {
      return `Value does not match pattern: ${getParamString(params, 'pattern') ?? 'unknown'}`;
    }
    case 'minimum': {
      return `Value must be >= ${String(getParamNumber(params, 'limit') ?? 0)}`;
    }
    case 'maximum': {
      return `Value must be <= ${String(getParamNumber(params, 'limit') ?? 0)}`;
    }
    default:
      return error.message ?? 'Validation error';
  }
}
