import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  PortablePlugin,
  PortableSkill,
  PortableMcpServer,
  SourceArtifact,
  MigrationWarning,
} from '@agent-plugins-builder/core';
import { MigrationClassification } from '@agent-plugins-builder/core';

export interface CodexAdapterResult {
  plugin: PortablePlugin;
  artifacts: SourceArtifact[];
  warnings: MigrationWarning[];
}

export function detectCodexProject(rootPath: string): boolean {
  return (
    fs.existsSync(path.join(rootPath, 'AGENTS.md')) ||
    fs.existsSync(path.join(rootPath, 'config.toml'))
  );
}

// Simple TOML parser for MCP servers (production would use a proper TOML library)
function parseMcpServersFromToml(tomlContent: string): PortableMcpServer[] {
  const servers: PortableMcpServer[] = [];

  // Match [mcp_servers.name] sections
  const serverRegex = /\[mcp_servers\.([^\]]+)\]([\s\S]*?)(?=\[|$)/g;
  let match;

  while ((match = serverRegex.exec(tomlContent)) !== null) {
    const serverName = match[1];
    const serverContent = match[2];

    // Extract fields
    const commandMatch = serverContent.match(/command\s*=\s*"([^"]+)"/);
    const argsMatch = serverContent.match(/args\s*=\s*\[([^\]]+)\]/);
    const urlMatch = serverContent.match(/url\s*=\s*"([^"]+)"/);

    if (commandMatch) {
      const server: any = {
        type: 'stdio',
        command: commandMatch[1],
        _name: serverName,
      };

      if (argsMatch) {
        server.args = argsMatch[1].split(',').map(s => s.trim().replace(/"/g, ''));
      }

      servers.push(server);
    } else if (urlMatch) {
      servers.push({
        type: 'streamable-http',
        url: urlMatch[1],
        _name: serverName,
      });
    }
  }

  return servers;
}

export async function migrateCodexProject(rootPath: string): Promise<CodexAdapterResult> {
  const artifacts: SourceArtifact[] = [];
  const warnings: MigrationWarning[] = [];
  const mcpServers: PortableMcpServer[] = [];
  let instructions: string | undefined;

  // Read AGENTS.md → instructions
  const agentsMdPath = path.join(rootPath, 'AGENTS.md');
  if (fs.existsSync(agentsMdPath)) {
    instructions = fs.readFileSync(agentsMdPath, 'utf-8');
    artifacts.push({
      path: 'AGENTS.md',
      format: 'codex-instructions',
      classification: MigrationClassification.PORTABLE,
    });
  }

  // Read config.toml → extract MCP servers
  const configPath = path.join(rootPath, 'config.toml');
  if (fs.existsSync(configPath)) {
    try {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      const parsedServers = parseMcpServersFromToml(configContent);
      mcpServers.push(...parsedServers);

      artifacts.push({
        path: 'config.toml',
        format: 'codex-config',
        classification: MigrationClassification.PORTABLE,
      });
    } catch (error) {
      warnings.push({
        severity: 'error',
        message: `Failed to parse config.toml: ${error}`,
      });
    }
  }

  // Detect hooks.json (CLIENT_SPECIFIC)
  const hooksPath = path.join(rootPath, 'hooks.json');
  if (fs.existsSync(hooksPath)) {
    artifacts.push({
      path: 'hooks.json',
      format: 'codex-hooks',
      classification: MigrationClassification.CLIENT_SPECIFIC,
      originalContent: fs.readFileSync(hooksPath, 'utf-8'),
    });
    warnings.push({
      severity: 'warning',
      message: 'Codex hooks are client-specific and will not be migrated',
      component: 'hooks',
    });
  }

  const plugin: PortablePlugin = {
    metadata: {
      name: 'migrated-plugin',
      description: 'Migrated from Codex',
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
