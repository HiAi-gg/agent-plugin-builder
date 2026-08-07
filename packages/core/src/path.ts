import * as path from 'node:path';
import * as fs from 'node:fs';

/**
 * Resolve a plugin-relative path against the plugin root.
 * Enforces:
 * - Path must start with './'
 * - Resolved path must be within plugin root (containment)
 * - Symlink escapes are rejected
 */
export function resolvePluginPath(pluginRoot: string, relativePath: string): string {
  if (!relativePath.startsWith('./')) {
    throw new Error(`Plugin-relative path must start with './': ${relativePath}`);
  }

  const resolved = path.resolve(pluginRoot, relativePath);
  const normalizedRoot = path.resolve(pluginRoot);

  if (!isWithinPath(resolved, normalizedRoot)) {
    throw new Error(`Path escapes plugin root: ${relativePath}`);
  }

  return resolved;
}

/**
 * Check if a path is within a parent directory.
 * Handles symlink resolution to prevent escapes.
 */
export function isWithinPath(child: string, parent: string): boolean {
  const normalizedChild = path.resolve(child);
  const normalizedParent = path.resolve(parent);

  // Check if child starts with parent
  if (!normalizedChild.startsWith(normalizedParent + path.sep) && normalizedChild !== normalizedParent) {
    return false;
  }

  // Resolve symlinks and check again
  try {
    const realChild = fs.realpathSync(normalizedChild);
    const realParent = fs.realpathSync(normalizedParent);

    return realChild.startsWith(realParent + path.sep) || realChild === realParent;
  } catch {
    // If realpath fails (file doesn't exist yet), fall back to normalized check
    return true;
  }
}

/**
 * Normalize a path to use forward slashes (cross-platform).
 */
export function normalizePath(p: string): string {
  return p.split(path.sep).join('/');
}
