/**
 * Expand placeholders in a string.
 * Only ${PLUGIN_ROOT} and ${PLUGIN_DATA} are expanded.
 * Single-pass, non-recursive.
 */
export function expandPlaceholders(
  value: string,
  pluginRoot: string,
  pluginData: string
): string {
  // Single-pass replacement: replace all occurrences, but don't re-scan
  return value
    .replace(/\$\{PLUGIN_ROOT\}/g, pluginRoot)
    .replace(/\$\{PLUGIN_DATA\}/g, pluginData);
}

/**
 * Expand placeholders in an array of strings (e.g., args).
 */
export function expandPlaceholdersInArray(
  values: string[],
  pluginRoot: string,
  pluginData: string
): string[] {
  return values.map((v) => expandPlaceholders(v, pluginRoot, pluginData));
}

/**
 * Expand placeholders in a record (e.g., env values).
 * Keys are NOT expanded (only values).
 */
export function expandPlaceholdersInRecord(
  record: Record<string, string>,
  pluginRoot: string,
  pluginData: string
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    result[key] = expandPlaceholders(value, pluginRoot, pluginData);
  }
  return result;
}

/**
 * Check if a string contains placeholders.
 */
export function hasPlaceholders(value: string): boolean {
  return /\$\{(PLUGIN_ROOT|PLUGIN_DATA)\}/.test(value);
}
