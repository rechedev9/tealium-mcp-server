import type { DebugResult } from './types.js';

export function formatDebugResult(result: DebugResult): string {
  const lines: string[] = [];

  lines.push('# Data Layer Debug Report');
  lines.push('');

  // Summary
  const errorCount = result.issues.filter((i) => i.severity === 'error').length;
  const warningCount = result.issues.filter((i) => i.severity === 'warning').length;
  const infoCount = result.issues.filter((i) => i.severity === 'info').length;

  lines.push('## Summary');
  lines.push(`- 🔴 Errors: ${String(errorCount)}`);
  lines.push(`- 🟡 Warnings: ${String(warningCount)}`);
  lines.push(`- 🔵 Info: ${String(infoCount)}`);
  lines.push(`- Missing variables: ${String(result.missingVariables.length)}`);
  lines.push(`- Type mismatches: ${String(result.typeMismatches.length)}`);
  lines.push('');

  // Issues
  if (result.issues.length > 0) {
    lines.push('## Issues');
    lines.push('');

    const grouped = {
      error: result.issues.filter((i) => i.severity === 'error'),
      warning: result.issues.filter((i) => i.severity === 'warning'),
      info: result.issues.filter((i) => i.severity === 'info'),
    };

    if (grouped.error.length > 0) {
      lines.push('### 🔴 Errors');
      for (const issue of grouped.error) {
        lines.push(`- **${issue.path}**: ${issue.issue}`);
        lines.push(`  - Fix: ${issue.recommendation}`);
      }
      lines.push('');
    }

    if (grouped.warning.length > 0) {
      lines.push('### 🟡 Warnings');
      for (const issue of grouped.warning) {
        lines.push(`- **${issue.path}**: ${issue.issue}`);
        lines.push(`  - Suggestion: ${issue.recommendation}`);
      }
      lines.push('');
    }

    if (grouped.info.length > 0) {
      lines.push('### 🔵 Info');
      for (const issue of grouped.info) {
        lines.push(`- **${issue.path}**: ${issue.issue}`);
      }
      lines.push('');
    }
  }

  // Missing variables
  if (result.missingVariables.length > 0) {
    lines.push('## Missing Variables');
    for (const variable of result.missingVariables) {
      lines.push(`- \`${variable}\``);
    }
    lines.push('');
  }

  // Type mismatches
  if (result.typeMismatches.length > 0) {
    lines.push('## Type Mismatches');
    for (const mismatch of result.typeMismatches) {
      lines.push(
        `- \`${mismatch.path}\`: expected **${mismatch.expected}**, got **${mismatch.actual}**`
      );
    }
    lines.push('');
  }

  // Recommendations
  if (result.recommendations.length > 0) {
    lines.push('## Recommendations');
    for (const rec of result.recommendations) {
      lines.push(`- ${rec}`);
    }
  }

  return lines.join('\n');
}
