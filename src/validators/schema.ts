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

  // Run validation
  const valid = validate(dataLayer);

  if (!valid && validate.errors !== undefined && validate.errors !== null) {
    for (const error of validate.errors) {
      const validationError: ValidationError = {
        path: error.instancePath === '' ? '/' : error.instancePath,
        message: formatAjvError(error),
        value: error.data,
      };
      if (error.schema !== undefined) {
        let schemaValue: string;
        if (error.schema === null) {
          schemaValue = 'null';
        } else if (typeof error.schema === 'object') {
          schemaValue = JSON.stringify(error.schema);
        } else if (
          typeof error.schema === 'string' ||
          typeof error.schema === 'number' ||
          typeof error.schema === 'boolean'
        ) {
          schemaValue = String(error.schema);
        } else {
          schemaValue = 'unknown';
        }
        (validationError as { expected?: string }).expected = schemaValue;
      }
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

function formatAjvError(error: ErrorObject): string {
  switch (error.keyword) {
    case 'required': {
      const params = error.params as { missingProperty?: string };
      return `Missing required property: ${params.missingProperty ?? 'unknown'}`;
    }
    case 'type': {
      const params = error.params as { type?: string };
      return `Expected ${params.type ?? 'unknown'}, got ${typeof error.data}`;
    }
    case 'enum': {
      const params = error.params as { allowedValues?: unknown[] };
      const values = params.allowedValues;
      return `Value must be one of: ${values !== undefined ? values.join(', ') : 'unknown'}`;
    }
    case 'minLength': {
      const params = error.params as { limit?: number };
      return `String is too short (minimum ${String(params.limit ?? 0)} characters)`;
    }
    case 'pattern': {
      const params = error.params as { pattern?: string };
      return `Value does not match pattern: ${params.pattern ?? 'unknown'}`;
    }
    case 'minimum': {
      const params = error.params as { limit?: number };
      return `Value must be >= ${String(params.limit ?? 0)}`;
    }
    case 'maximum': {
      const params = error.params as { limit?: number };
      return `Value must be <= ${String(params.limit ?? 0)}`;
    }
    default:
      return error.message ?? 'Validation error';
  }
}
