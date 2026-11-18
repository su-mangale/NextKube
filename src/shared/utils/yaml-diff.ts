/**
 * High-performance YAML & Kubernetes Manifest Diff Engine
 * Computes line-by-line diffs, strips transient K8s metadata, and generates unified patches.
 */

import yaml from 'js-yaml';
import { DiffLine, DiffSummary } from '../types/dashboard.types';

/**
 * Filter out transient Kubernetes metadata fields that pollute manifest diffs
 * (e.g. managedFields, resourceVersion, uid, creationTimestamp, status).
 */
export function sanitizeKubernetesYaml(rawYaml: string): string {
  try {
    const doc = yaml.load(rawYaml) as any;
    if (!doc || typeof doc !== 'object') return rawYaml.trim();

    // Deep clone to avoid mutating input
    const cleaned = JSON.parse(JSON.stringify(doc));

    if (cleaned.metadata) {
      delete cleaned.metadata.managedFields;
      delete cleaned.metadata.resourceVersion;
      delete cleaned.metadata.uid;
      delete cleaned.metadata.generation;
      delete cleaned.metadata.creationTimestamp;
      delete cleaned.metadata.selfLink;

      if (cleaned.metadata.annotations) {
        delete cleaned.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration'];
        delete cleaned.metadata.annotations['deployment.kubernetes.io/revision'];
        if (Object.keys(cleaned.metadata.annotations).length === 0) {
          delete cleaned.metadata.annotations;
        }
      }
    }

    // Strip live cluster status field unless specifically looking for status
    delete cleaned.status;

    return yaml.dump(cleaned, { indent: 2, lineWidth: -1, noRefs: true }).trim();
  } catch {
    // If not valid YAML, return as-is
    return rawYaml.trim();
  }
}

/**
 * Computes line-by-line diff between textA and textB using Longest Common Subsequence (LCS).
 */
export function computeLineDiff(textA: string, textB: string): DiffLine[] {
  const linesA = textA.length ? textA.split(/\r?\n/) : [];
  const linesB = textB.length ? textB.split(/\r?\n/) : [];

  const n = linesA.length;
  const m = linesB.length;

  // For very large texts, fall back to simple line matching
  if (n * m > 250000) {
    return simpleLineDiff(linesA, linesB);
  }

  // Build LCS matrix
  const matrix: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (linesA[i] === linesB[j]) {
        matrix[i + 1][j + 1] = matrix[i][j] + 1;
      } else {
        matrix[i + 1][j + 1] = Math.max(matrix[i + 1][j], matrix[i][j + 1]);
      }
    }
  }

  // Backtrack to build the diff
  let i = n;
  let j = m;
  const resultReversed: DiffLine[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && linesA[i - 1] === linesB[j - 1]) {
      resultReversed.push({
        type: 'unchanged',
        oldLineNumber: i,
        newLineNumber: j,
        content: linesA[i - 1],
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
      resultReversed.push({
        type: 'added',
        newLineNumber: j,
        content: linesB[j - 1],
      });
      j--;
    } else if (i > 0 && (j === 0 || matrix[i][j - 1] < matrix[i - 1][j])) {
      resultReversed.push({
        type: 'removed',
        oldLineNumber: i,
        content: linesA[i - 1],
      });
      i--;
    }
  }

  return resultReversed.reverse();
}

/**
 * Fallback line diff for unusually large inputs to maintain high UI responsiveness
 */
function simpleLineDiff(linesA: string[], linesB: string[]): DiffLine[] {
  const max = Math.max(linesA.length, linesB.length);
  const diff: DiffLine[] = [];

  for (let i = 0; i < max; i++) {
    const a = linesA[i];
    const b = linesB[i];
    if (a === b && a !== undefined) {
      diff.push({ type: 'unchanged', oldLineNumber: i + 1, newLineNumber: i + 1, content: a });
    } else {
      if (a !== undefined) diff.push({ type: 'removed', oldLineNumber: i + 1, content: a });
      if (b !== undefined) diff.push({ type: 'added', newLineNumber: i + 1, content: b });
    }
  }
  return diff;
}

/**
 * Summarizes diff statistics (additions, deletions, modifications, identical flag)
 */
export function calculateDiffSummary(diffLines: DiffLine[]): DiffSummary {
  let additions = 0;
  let deletions = 0;

  for (const line of diffLines) {
    if (line.type === 'added') additions++;
    else if (line.type === 'removed') deletions++;
  }

  const modifications = Math.min(additions, deletions);
  const identical = additions === 0 && deletions === 0;

  return { additions, deletions, modifications, identical };
}

/**
 * Generates a unified patch file format (standard Git format)
 */
export function generateUnifiedPatch(
  oldTitle: string,
  newTitle: string,
  diffLines: DiffLine[]
): string {
  const header = `--- a/${oldTitle}\n+++ b/${newTitle}\n@@ -1,${diffLines.filter((l) => l.type !== 'added').length} +1,${diffLines.filter((l) => l.type !== 'removed').length} @@\n`;

  const body = diffLines
    .map((line) => {
      switch (line.type) {
        case 'added':
          return `+${line.content}`;
        case 'removed':
          return `-${line.content}`;
        default:
          return ` ${line.content}`;
      }
    })
    .join('\n');

  return header + body;
}
