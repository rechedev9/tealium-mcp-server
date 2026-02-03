import type { DebugResult, DebugIssue, TypeMismatch } from './types.js';
import { isTealiumDataLayer } from '../../types/index.js';
import {
  checkEmptyValues,
  checkDataTypes,
  checkCommonMissingVariables,
  checkEventTracking,
  checkBookingFunnel,
  checkSpecificArea,
  generateRecommendations,
} from './checks.js';

export interface DebugDataLayerArgs {
  readonly dataLayer: unknown;
  readonly expectedSchema?: string;
  readonly checkPoints?: readonly string[];
}

export function debugDataLayer(args: DebugDataLayerArgs): DebugResult {
  const { dataLayer, checkPoints = [] } = args;

  // Validate that dataLayer is a valid TealiumDataLayer
  if (!isTealiumDataLayer(dataLayer)) {
    return {
      dataLayerSnapshot: {},
      issues: [
        {
          severity: 'error',
          path: '/',
          issue: 'Invalid data layer: must be an object',
          recommendation: 'Provide a valid data layer object',
        },
      ],
      missingVariables: [],
      typeMismatches: [],
      recommendations: ['Ensure the data layer is a valid object'],
    };
  }

  const issues: DebugIssue[] = [];
  const missingVariables: string[] = [];
  const typeMismatches: TypeMismatch[] = [];
  const recommendations: string[] = [];

  // Check for common issues
  checkEmptyValues(dataLayer, '', issues);
  checkDataTypes(dataLayer, '', typeMismatches);
  checkCommonMissingVariables(dataLayer, missingVariables);
  checkEventTracking(dataLayer, issues, recommendations);
  checkBookingFunnel(dataLayer, issues, recommendations);

  // Process specific checkpoints if provided
  for (const checkpoint of checkPoints) {
    checkSpecificArea(dataLayer, checkpoint, issues, recommendations);
  }

  // Generate general recommendations
  generateRecommendations(dataLayer, issues, recommendations);

  return {
    dataLayerSnapshot: dataLayer,
    issues,
    missingVariables,
    typeMismatches,
    recommendations: [...new Set(recommendations)], // Remove duplicates
  };
}

// Re-export formatter and types
export { formatDebugResult } from './formatters.js';
export type { DebugResult, DebugIssue, TypeMismatch } from './types.js';
