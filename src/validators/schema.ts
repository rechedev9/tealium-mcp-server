import Ajv from 'ajv';
import type { ErrorObject } from 'ajv';
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
  schemaUri: string = 'tealium://schema/standard'
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];

  // Get the validator
  const validate = ajv.getSchema(schemaUri);

  if (!validate) {
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

  if (!valid && validate.errors) {
    for (const error of validate.errors) {
      errors.push({
        path: error.instancePath || '/',
        message: formatAjvError(error),
        value: error.data,
        expected: error.schema?.toString(),
      });
    }
  }

  // Generate summary
  const summary = valid
    ? 'Data layer is valid'
    : `Found ${errors.length} error(s) in data layer`;

  return {
    isValid: Boolean(valid),
    errors,
    warnings,
    suggestions,
    summary,
  };
}

function formatAjvError(error: ErrorObject): string {
  switch (error.keyword) {
    case 'required':
      return `Missing required property: ${error.params.missingProperty}`;
    case 'type':
      return `Expected ${error.params.type}, got ${typeof error.data}`;
    case 'enum':
      return `Value must be one of: ${error.params.allowedValues?.join(', ')}`;
    case 'minLength':
      return `String is too short (minimum ${error.params.limit} characters)`;
    case 'pattern':
      return `Value does not match pattern: ${error.params.pattern}`;
    case 'minimum':
      return `Value must be >= ${error.params.limit}`;
    case 'maximum':
      return `Value must be <= ${error.params.limit}`;
    default:
      return error.message || 'Validation error';
  }
}
