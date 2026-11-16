import yaml from 'js-yaml';

export type YamlDumpOptions = yaml.DumpOptions;

/**
 * Serializes a JavaScript object into clean, idiomatic block-style YAML.
 *
 * Defaults:
 * - 2-space indentation
 * - Unlimited line width (prevents unexpected line folding)
 * - Reference anchors disabled (no &ref / *ref clutter)
 */
export function dumpYaml(data: unknown, options?: YamlDumpOptions): string {
  if (data === undefined || data === null) {
    return '{}\n';
  }

  // Handle empty plain object
  if (typeof data === 'object' && !Array.isArray(data) && Object.keys(data as object).length === 0) {
    return '{}\n';
  }

  return yaml.dump(data, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
    ...options,
  });
}

/**
 * Safely deserializes a YAML string into a typed JavaScript object.
 *
 * Returns an empty object if the input is empty or whitespace.
 * Throws a formatted error if syntax is invalid.
 */
export function parseYaml<T = unknown>(str: string): T {
  if (!str || !str.trim()) {
    return {} as T;
  }

  const result = yaml.load(str);
  if (result === undefined || result === null) {
    return {} as T;
  }

  return result as T;
}
