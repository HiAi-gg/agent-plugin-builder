import * as path from "node:path";
import type { MigrationWarning } from "./types";

/**
 * Normalize an MCP server cwd for emission.
 *
 * The Agent Plugins mcp.json schema only accepts cwd values starting with
 * `./`, `${PLUGIN_ROOT}`, or `${PLUGIN_DATA}`; absolute filesystem paths are
 * rejected. This helper:
 * - converts absolute paths inside the base directory to `./`-relative paths,
 * - preserves already-valid values (`./…` and `${PLUGIN_*}` placeholders),
 * - preserves out-of-base absolute paths untouched while returning a warning.
 *
 * @param baseDir directory the cwd is resolved relative to (project root or config dir)
 * @param serverName name of the MCP server (for the warning message)
 * @param cwd the configured cwd value, if any
 * @param baseLabel human-readable label for `baseDir` in the warning message
 */
export function normalizeMcpCwd(
  baseDir: string,
  serverName: string,
  cwd: string | undefined,
  baseLabel = "project root",
): { cwd?: string; warning?: MigrationWarning } {
  if (!cwd || !path.isAbsolute(cwd)) {
    // Relative (`./…`) and `${PLUGIN_*}` placeholder values are schema-valid.
    return { cwd };
  }

  const relativePath = path.relative(baseDir, cwd);
  if (!relativePath.startsWith("..")) {
    // Inside the base directory → emit a portable `./`-relative path.
    return { cwd: "./" + relativePath.replace(/\\/g, "/") };
  }

  // Outside the base directory → preserve the original, flag for the user.
  return {
    cwd,
    warning: {
      severity: "warning",
      message: `MCP server "${serverName}" has cwd outside ${baseLabel}: ${cwd}`,
      component: "mcp",
    },
  };
}
