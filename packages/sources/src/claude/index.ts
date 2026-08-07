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

export interface ClaudeAdapterResult {
  plugin: PortablePlugin;
  artifacts: SourceArtifact[];
  warnings: MigrationWarning[];
}

export function detectClaudeProject(rootPath: string): boolean {
  return (
    fs.existsSync(path.join(rootPath, 'CLAUDE.md')) ||
    fs.existsSync(path.join(rootPath, '.claude'))
  );
}

export async function migrateClaudeProject(rootPath: string): Promise<ClaudeAdapterResult> {
  const artifacts: SourceArtifact[] = [];
  const warnings: MigrationWarning[] = [];
  const skills: PortableSkill[] = [];
  const mcpServers: PortableMcpServer[] = [];
  let instructions: string | undefined;

  // Read CLAUDE.md → instructions
  const claudeMdPath = path.join(rootPath, 'CLAUDE.md');
  if (fs.existsSync(claudeMdPath)) {
    instructions = fs.readFileSync(claudeMdPath, 'utf-8');
    artifacts.push({
      path: 'CLAUDE.md',
      format: 'claude-instructions',
      classification: MigrationClassification.PORTABLE,
    });
  }

  // Read .claude/skills/
  const skillsDir = path.join(rootPath, '.claude', 'skills');
  if (fs.existsSync(skillsDir) && fs.statSync(skillsDir).isDirectory()) {
    const skillDirs = fs.readdirSync(skillsDir);
    for (const skillDir of skillDirs) {
      const skillMdPath = path.join(skillsDir, skillDir, 'SKILL.md');
      if (fs.existsSync(skillMdPath)) {
        const content = fs.readFileSync(skillMdPath, 'utf-8');
        // Parse frontmatter (simplified - in production use gray-matter)
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

        // Extract name and description from frontmatter
        const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
        const descMatch = frontmatter.match(/^description:\s*(.+)$/m);

        skills.push({
          name: nameMatch?.[1]?.trim() || skillDir,
          description: descMatch?.[1]?.trim() || 'Migrated skill',
          body: body.trim(),
          sourcePath: `.claude/skills/${skillDir}/SKILL.md`,
        });

        artifacts.push({
          path: `.claude/skills/${skillDir}/SKILL.md`,
          format: 'claude-skill',
          classification: MigrationClassification.PORTABLE,
        });
      }
    }
  }

  // Read .mcp.json
  const mcpJsonPath = path.join(rootPath, '.mcp.json');
  if (fs.existsSync(mcpJsonPath)) {
    try {
      const mcpContent = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf-8'));
      if (mcpContent.mcpServers) {
        for (const [name, server] of Object.entries(mcpContent.mcpServers)) {
          mcpServers.push({ ...(server as PortableMcpServer), _name: name });
        }
      }
      artifacts.push({
        path: '.mcp.json',
        format: 'claude-mcp',
        classification: MigrationClassification.PORTABLE,
      });
    } catch (error) {
      warnings.push({
        severity: 'error',
        message: `Failed to parse .mcp.json: ${error}`,
      });
    }
  }

  // Detect .claude/settings.json (CLIENT_SPECIFIC)
  const settingsPath = path.join(rootPath, '.claude', 'settings.json');
  if (fs.existsSync(settingsPath)) {
    artifacts.push({
      path: '.claude/settings.json',
      format: 'claude-settings',
      classification: MigrationClassification.CLIENT_SPECIFIC,
      originalContent: fs.readFileSync(settingsPath, 'utf-8'),
    });
    warnings.push({
      severity: 'warning',
      message: 'Claude settings.json contains hooks and permissions that are client-specific',
      component: 'hooks',
      suggestion: 'These will not be migrated to the Agent Plugin',
    });
  }

  // Detect .claude/agents/ (UNSUPPORTED)
  const agentsDir = path.join(rootPath, '.claude', 'agents');
  if (fs.existsSync(agentsDir) && fs.statSync(agentsDir).isDirectory()) {
    const agentFiles = fs.readdirSync(agentsDir);
    for (const agentFile of agentFiles) {
      artifacts.push({
        path: `.claude/agents/${agentFile}`,
        format: 'claude-agent',
        classification: MigrationClassification.UNSUPPORTED,
      });
    }
    warnings.push({
      severity: 'info',
      message: `Found ${agentFiles.length} Claude subagent(s) - these are not supported in Agent Plugins v1`,
      component: 'agents',
    });
  }

  // Detect .claude/rules/ (CLIENT_SPECIFIC)
  const rulesDir = path.join(rootPath, '.claude', 'rules');
  if (fs.existsSync(rulesDir) && fs.statSync(rulesDir).isDirectory()) {
    const ruleFiles = fs.readdirSync(rulesDir);
    for (const ruleFile of ruleFiles) {
      artifacts.push({
        path: `.claude/rules/${ruleFile}`,
        format: 'claude-rule',
        classification: MigrationClassification.CLIENT_SPECIFIC,
      });
    }
    warnings.push({
      severity: 'info',
      message: `Found ${ruleFiles.length} Claude rule(s) with glob-gating - these are client-specific`,
      component: 'rules',
    });
  }

  const plugin: PortablePlugin = {
    metadata: {
      name: 'migrated-plugin',
      description: 'Migrated from Claude Code',
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
