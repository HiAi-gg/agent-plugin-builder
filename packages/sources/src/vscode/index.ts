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

export interface VscodeAdapterResult {
  plugin: PortablePlugin;
  artifacts: SourceArtifact[];
  warnings: MigrationWarning[];
}

export function detectVscodeProject(rootPath: string): boolean {
  return (
    fs.existsSync(path.join(rootPath, '.github')) ||
    fs.existsSync(path.join(rootPath, '.vscode'))
  );
}

export async function migrateVscodeProject(rootPath: string): Promise<VscodeAdapterResult> {
  const artifacts: SourceArtifact[] = [];
  const warnings: MigrationWarning[] = [];
  const skills: PortableSkill[] = [];
  const mcpServers: PortableMcpServer[] = [];
  let instructions: string | undefined;

  // Read .github/copilot-instructions.md → instructions
  const copilotInstructionsPath = path.join(rootPath, '.github', 'copilot-instructions.md');
  if (fs.existsSync(copilotInstructionsPath)) {
    instructions = fs.readFileSync(copilotInstructionsPath, 'utf-8');
    artifacts.push({
      path: '.github/copilot-instructions.md',
      format: 'vscode-instructions',
      classification: MigrationClassification.PORTABLE,
    });
  }

  // Read AGENTS.md → instructions (if not already set)
  const agentsMdPath = path.join(rootPath, 'AGENTS.md');
  if (!instructions && fs.existsSync(agentsMdPath)) {
    instructions = fs.readFileSync(agentsMdPath, 'utf-8');
    artifacts.push({
      path: 'AGENTS.md',
      format: 'vscode-instructions',
      classification: MigrationClassification.PORTABLE,
    });
  }

  // Read .github/skills/
  const skillsDir = path.join(rootPath, '.github', 'skills');
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
          sourcePath: `.github/skills/${skillDir}/SKILL.md`,
        });

        artifacts.push({
          path: `.github/skills/${skillDir}/SKILL.md`,
          format: 'vscode-skill',
          classification: MigrationClassification.PORTABLE,
        });
      }
    }
  }

  // Read .vscode/mcp.json → extract servers (CRITICAL: uses 'servers' not 'mcpServers')
  const mcpJsonPath = path.join(rootPath, '.vscode', 'mcp.json');
  if (fs.existsSync(mcpJsonPath)) {
    try {
      const mcpContent = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf-8'));

      // VS Code uses 'servers' key, need to remap to our format
      const servers = mcpContent.servers || mcpContent.mcpServers;

      if (servers) {
        for (const [name, server] of Object.entries(servers)) {
          const serverConfig = server as any;

          // Map VS Code server types to our types
          if (serverConfig.type === 'stdio') {
            mcpServers.push({
              type: 'stdio',
              command: serverConfig.command,
              args: serverConfig.args,
              env: serverConfig.env,
              cwd: serverConfig.cwd,
              _name: name,
            });
          } else if (serverConfig.type === 'http' || serverConfig.type === 'streamable-http') {
            mcpServers.push({
              type: 'streamable-http',
              url: serverConfig.url,
              headers: serverConfig.headers,
              _name: name,
            });
          } else if (serverConfig.type === 'sse') {
            mcpServers.push({
              type: 'sse',
              url: serverConfig.url,
              headers: serverConfig.headers,
              _name: name,
            });
          }
        }
      }

      artifacts.push({
        path: '.vscode/mcp.json',
        format: 'vscode-mcp',
        classification: MigrationClassification.PORTABLE,
      });
    } catch (error) {
      warnings.push({
        severity: 'error',
        message: `Failed to parse .vscode/mcp.json: ${error}`,
      });
    }
  }

  // Detect .github/agents/ (UNSUPPORTED)
  const agentsDir = path.join(rootPath, '.github', 'agents');
  if (fs.existsSync(agentsDir) && fs.statSync(agentsDir).isDirectory()) {
    const agentFiles = fs.readdirSync(agentsDir);
    for (const agentFile of agentFiles) {
      artifacts.push({
        path: `.github/agents/${agentFile}`,
        format: 'vscode-agent',
        classification: MigrationClassification.UNSUPPORTED,
      });
    }
    warnings.push({
      severity: 'info',
      message: `Found ${agentFiles.length} VS Code custom agent(s) - not supported in Agent Plugins v1`,
      component: 'agents',
    });
  }

  const plugin: PortablePlugin = {
    metadata: {
      name: 'migrated-plugin',
      description: 'Migrated from VS Code/Copilot',
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
