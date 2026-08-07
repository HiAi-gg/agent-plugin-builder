import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  PortablePlugin,
  PortableSkill,
  PortableMcpServer,
  SourceArtifact,
  MigrationWarning,
} from '@agent-plugin-builder/core';
import { MigrationClassification } from '@agent-plugin-builder/core';

export interface OpenCodeAdapterResult {
  plugin: PortablePlugin;
  artifacts: SourceArtifact[];
  warnings: MigrationWarning[];
}

export function detectOpenCodeProject(rootPath: string): boolean {
  return (
    fs.existsSync(path.join(rootPath, 'AGENTS.md')) ||
    fs.existsSync(path.join(rootPath, 'opencode.json')) ||
    fs.existsSync(path.join(rootPath, '.opencode'))
  );
}

function convertOpenCodeMcpToPortable(mcpConfig: any): PortableMcpServer[] {
  const servers: PortableMcpServer[] = [];

  for (const [name, config] of Object.entries(mcpConfig)) {
    const serverConfig = config as any;

    if (serverConfig.type === 'local') {
      // Map 'local' to 'stdio'
      const command = Array.isArray(serverConfig.command)
        ? serverConfig.command[0]
        : serverConfig.command;
      const args = Array.isArray(serverConfig.command)
        ? serverConfig.command.slice(1)
        : serverConfig.args || [];

      servers.push({
        type: 'stdio',
        command,
        args,
        env: serverConfig.environment,
        cwd: serverConfig.cwd,
      });
    } else if (serverConfig.type === 'remote') {
      // Map 'remote' to 'streamable-http'
      servers.push({
        type: 'streamable-http',
        url: serverConfig.url,
        headers: serverConfig.headers,
      });
    }
  }

  return servers;
}

export async function migrateOpenCodeProject(rootPath: string): Promise<OpenCodeAdapterResult> {
  const artifacts: SourceArtifact[] = [];
  const warnings: MigrationWarning[] = [];
  const skills: PortableSkill[] = [];
  const mcpServers: PortableMcpServer[] = [];
  let instructions: string | undefined;

  // Read AGENTS.md → instructions
  const agentsMdPath = path.join(rootPath, 'AGENTS.md');
  if (fs.existsSync(agentsMdPath)) {
    instructions = fs.readFileSync(agentsMdPath, 'utf-8');
    artifacts.push({
      path: 'AGENTS.md',
      format: 'opencode-instructions',
      classification: MigrationClassification.PORTABLE,
    });
  }

  // Read .opencode/skills/
  const skillsDir = path.join(rootPath, '.opencode', 'skills');
  if (fs.existsSync(skillsDir) && fs.statSync(skillsDir).isDirectory()) {
    const skillDirs = fs.readdirSync(skillsDir);
    for (const skillDir of skillDirs) {
      const skillMdPath = path.join(skillsDir, skillDir, 'SKILL.md');
      if (fs.existsSync(skillMdPath)) {
        const content = fs.readFileSync(skillMdPath, 'utf-8');
        // Parse frontmatter (simplified)
        const lines = content.split('\n');
        let inFrontmatter = false;
        let frontmatter = '';
        let body = '';

        for (const line of lines) {
          if (line.trim() === '---') {
            if (!inFrontmatter) {
              inFrontmatter = true;
              continue;
            } else {
              inFrontmatter = false;
              continue;
            }
          }
          if (inFrontmatter) {
            frontmatter += line + '\n';
          } else {
            body += line + '\n';
          }
        }

        const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
        const descMatch = frontmatter.match(/^description:\s*(.+)$/m);

        skills.push({
          name: nameMatch?.[1]?.trim() || skillDir,
          description: descMatch?.[1]?.trim() || 'Migrated skill',
          body: body.trim(),
          sourcePath: `.opencode/skills/${skillDir}/SKILL.md`,
        });

        artifacts.push({
          path: `.opencode/skills/${skillDir}/SKILL.md`,
          format: 'opencode-skill',
          classification: MigrationClassification.PORTABLE,
        });
      }
    }
  }

  // Read opencode.json → extract MCP section
  const configPath = path.join(rootPath, 'opencode.json');
  if (fs.existsSync(configPath)) {
    try {
      const configContent = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (configContent.mcp) {
        const convertedServers = convertOpenCodeMcpToPortable(configContent.mcp);
        mcpServers.push(...convertedServers);
      }
      artifacts.push({
        path: 'opencode.json',
        format: 'opencode-config',
        classification: MigrationClassification.PORTABLE,
      });
    } catch (error) {
      warnings.push({
        severity: 'error',
        message: `Failed to parse opencode.json: ${error}`,
      });
    }
  }

  // Detect .opencode/plugins/ (CLIENT_SPECIFIC)
  const pluginsDir = path.join(rootPath, '.opencode', 'plugins');
  if (fs.existsSync(pluginsDir) && fs.statSync(pluginsDir).isDirectory()) {
    const pluginFiles = fs.readdirSync(pluginsDir);
    for (const pluginFile of pluginFiles) {
      artifacts.push({
        path: `.opencode/plugins/${pluginFile}`,
        format: 'opencode-plugin',
        classification: MigrationClassification.CLIENT_SPECIFIC,
      });
    }
    warnings.push({
      severity: 'info',
      message: `Found ${pluginFiles.length} OpenCode plugin(s) - these are client-specific`,
      component: 'plugins',
    });
  }

  // Detect .opencode/agents/ (UNSUPPORTED)
  const agentsDir = path.join(rootPath, '.opencode', 'agents');
  if (fs.existsSync(agentsDir) && fs.statSync(agentsDir).isDirectory()) {
    const agentFiles = fs.readdirSync(agentsDir);
    for (const agentFile of agentFiles) {
      artifacts.push({
        path: `.opencode/agents/${agentFile}`,
        format: 'opencode-agent',
        classification: MigrationClassification.UNSUPPORTED,
      });
    }
    warnings.push({
      severity: 'info',
      message: `Found ${agentFiles.length} OpenCode custom agent(s) - not supported in Agent Plugins v1`,
      component: 'agents',
    });
  }

  const plugin: PortablePlugin = {
    metadata: {
      name: 'migrated-plugin',
      description: 'Migrated from OpenCode',
    },
    instructions,
    skills,
    mcpServers,
    extensions: [],
    sourceArtifacts: artifacts,
    migrationWarnings: warnings,
  };

  return { plugin, artifacts, warnings };
}
