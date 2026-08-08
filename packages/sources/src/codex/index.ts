import * as fs from "node:fs";
import * as path from "node:path";
import type {
  PortablePlugin,
  PortableSkill,
  PortableMcpServer,
  SourceArtifact,
  MigrationWarning,
} from "@agent-plugins-builder/core";
import { MigrationClassification } from "@agent-plugins-builder/core";

export interface CodexAdapterResult {
  plugin: PortablePlugin;
  artifacts: SourceArtifact[];
  warnings: MigrationWarning[];
}

export function detectCodexProject(rootPath: string): boolean {
  return (
    fs.existsSync(path.join(rootPath, "AGENTS.md")) ||
    fs.existsSync(path.join(rootPath, "config.toml"))
  );
}

// Simple TOML parser for MCP servers (production would use a proper TOML library).
// Sections are split by line: each [mcp_servers.<name>] table header starts a
// new section. This keeps values like args = ["codex.js", "--flag"] intact even
// though they contain brackets (the previous regex terminated at the first `[`).
function parseMcpServersFromToml(tomlContent: string): {
  servers: PortableMcpServer[];
  warnings: MigrationWarning[];
} {
  const servers: PortableMcpServer[] = [];
  const warnings: MigrationWarning[] = [];

  let currentSection: string | null = null;
  let currentContent: string[] = [];

  const flushSection = (): void => {
    if (currentSection === null) {
      return;
    }

    const serverName = currentSection;
    const serverContent = currentContent.join("\n");
    currentSection = null;
    currentContent = [];

    const commandMatch = serverContent.match(/command\s*=\s*"([^"]+)"/);
    const urlMatch = serverContent.match(/url\s*=\s*"([^"]+)"/);

    if (commandMatch) {
      const server: PortableMcpServer = {
        type: "stdio",
        command: commandMatch[1],
        _name: serverName,
      };

      const args = parseTomlStringArray(serverContent);
      if (args !== null) {
        server.args = args;
      } else if (/^\s*args\s*=/m.test(serverContent)) {
        warnings.push({
          severity: "warning",
          message: `Failed to parse args for MCP server '${serverName}'; args will not be migrated`,
          component: "mcp",
        });
      }

      servers.push(server);
    } else if (urlMatch) {
      servers.push({
        type: "streamable-http",
        url: urlMatch[1],
        _name: serverName,
      });
    }
  };

  for (const line of tomlContent.split("\n")) {
    // Any TOML table header ([...] or [[...]]) ends the current section.
    if (/^\[+[^\]]+\]+$/.test(line)) {
      flushSection();
      const mcpMatch = line.match(/^\[mcp_servers\.([^\]]+)\]$/);
      if (mcpMatch) {
        currentSection = mcpMatch[1];
      }
    } else if (currentSection !== null) {
      currentContent.push(line);
    }
  }
  flushSection();

  return { servers, warnings };
}

// Extract the value of an `args = [...]` key as a TOML inline array of strings.
// Returns null when the key is missing or the array cannot be parsed.
function parseTomlStringArray(sectionContent: string): string[] | null {
  const match = sectionContent.match(
    /(?:^|\n)\s*args\s*=\s*\[([\s\S]*?)\]\s*(?:#.*)?(?:\n|$)/,
  );
  if (!match) {
    return null;
  }

  const inner = match[1];
  const items: string[] = [];
  let current = "";
  let quote: string | null = null;

  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];

    if (quote !== null) {
      current += ch;
      if (ch === "\\" && quote === '"') {
        // Keep escape sequences (e.g. \", \\, \n) together.
        if (i + 1 < inner.length) {
          current += inner[i + 1];
          i++;
        }
      } else if (ch === quote) {
        quote = null;
      }
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
    } else if (ch === ",") {
      items.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  items.push(current.trim());

  return items
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => {
      if (
        item.length >= 2 &&
        (item[0] === '"' || item[0] === "'") &&
        item[item.length - 1] === item[0]
      ) {
        return item.slice(1, -1);
      }
      return item;
    });
}

export async function migrateCodexProject(
  rootPath: string,
): Promise<CodexAdapterResult> {
  const artifacts: SourceArtifact[] = [];
  const warnings: MigrationWarning[] = [];
  const mcpServers: PortableMcpServer[] = [];
  let instructions: string | undefined;

  // Read AGENTS.md → instructions
  const agentsMdPath = path.join(rootPath, "AGENTS.md");
  if (fs.existsSync(agentsMdPath)) {
    instructions = fs.readFileSync(agentsMdPath, "utf-8");
    artifacts.push({
      path: "AGENTS.md",
      format: "codex-instructions",
      classification: MigrationClassification.PORTABLE,
    });
  }

  // Read config.toml → extract MCP servers
  const configPath = path.join(rootPath, "config.toml");
  if (fs.existsSync(configPath)) {
    try {
      const configContent = fs.readFileSync(configPath, "utf-8");
      const parsed = parseMcpServersFromToml(configContent);
      mcpServers.push(...parsed.servers);
      warnings.push(...parsed.warnings);

      artifacts.push({
        path: "config.toml",
        format: "codex-config",
        classification: MigrationClassification.PORTABLE,
      });
    } catch (error) {
      warnings.push({
        severity: "error",
        message: `Failed to parse config.toml: ${error}`,
      });
    }
  }

  // Detect hooks.json (CLIENT_SPECIFIC)
  const hooksPath = path.join(rootPath, "hooks.json");
  if (fs.existsSync(hooksPath)) {
    artifacts.push({
      path: "hooks.json",
      format: "codex-hooks",
      classification: MigrationClassification.CLIENT_SPECIFIC,
      originalContent: fs.readFileSync(hooksPath, "utf-8"),
    });
    warnings.push({
      severity: "warning",
      message: "Codex hooks are client-specific and will not be migrated",
      component: "hooks",
    });
  }

  const plugin: PortablePlugin = {
    metadata: {
      name: "migrated-plugin",
      description: "Migrated from Codex",
    },
    instructions,
    skills: [],
    mcpServers,
    extensions: [],
    sourceArtifacts: artifacts,
    migrationWarnings: warnings,
  };

  return { plugin, artifacts, warnings };
}
