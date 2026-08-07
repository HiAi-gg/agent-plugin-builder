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

export interface CursorAdapterResult {
  plugin: PortablePlugin;
  artifacts: SourceArtifact[];
  warnings: MigrationWarning[];
}

export function detectCursorProject(rootPath: string): boolean {
  return fs.existsSync(path.join(rootPath, '.cursor'));
}

export async function migrateCursorProject(rootPath: string): Promise<CursorAdapterResult> {
  const artifacts: SourceArtifact[] = [];
  const warnings: MigrationWarning[] = [];
  const skills: PortableSkill[] = [];
  const mcpServers: PortableMcpServer[] = [];

  // Read .cursor/skills/
  const skillsDir = path.join(rootPath, '.cursor', 'skills');
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
          sourcePath: `.cursor/skills/${skillDir}/SKILL.md`,
        });

        artifacts.push({
          path: `.cursor/skills/${skillDir}/SKILL.md`,
          format: 'cursor-skill',
          classification: MigrationClassification.PORTABLE,
        });
      }
    }
  }

  // Read .cursor/mcp.json
  const mcpJsonPath = path.join(rootPath, '.cursor', 'mcp.json');
  if (fs.existsSync(mcpJsonPath)) {
    try {
      const mcpContent = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf-8'));
      if (mcpContent.mcpServers) {
        for (const [name, server] of Object.entries(mcpContent.mcpServers)) {
          mcpServers.push({ ...(server as PortableMcpServer), _name: name });
        }
      }
      artifacts.push({
        path: '.cursor/mcp.json',
        format: 'cursor-mcp',
        classification: MigrationClassification.PORTABLE,
      });
    } catch (error) {
      warnings.push({
        severity: 'error',
        message: `Failed to parse .cursor/mcp.json: ${error}`,
      });
    }
  }

  // Detect .cursor/rules/*.mdc (CLIENT_SPECIFIC)
  const rulesDir = path.join(rootPath, '.cursor', 'rules');
  if (fs.existsSync(rulesDir) && fs.statSync(rulesDir).isDirectory()) {
    const ruleFiles = fs.readdirSync(rulesDir);
    for (const ruleFile of ruleFiles) {
      artifacts.push({
        path: `.cursor/rules/${ruleFile}`,
        format: 'cursor-rule',
        classification: MigrationClassification.CLIENT_SPECIFIC,
      });
    }
    warnings.push({
      severity: 'info',
      message: `Found ${ruleFiles.length} Cursor rule(s) with globs - these are client-specific`,
      component: 'rules',
    });
  }

  // Detect .cursor/hooks.json (CLIENT_SPECIFIC)
  const hooksPath = path.join(rootPath, '.cursor', 'hooks.json');
  if (fs.existsSync(hooksPath)) {
    artifacts.push({
      path: '.cursor/hooks.json',
      format: 'cursor-hooks',
      classification: MigrationClassification.CLIENT_SPECIFIC,
      originalContent: fs.readFileSync(hooksPath, 'utf-8'),
    });
    warnings.push({
      severity: 'warning',
      message: 'Cursor hooks are client-specific and will not be migrated',
      component: 'hooks',
    });
  }

  // Detect .cursor/agents/ (UNSUPPORTED)
  const agentsDir = path.join(rootPath, '.cursor', 'agents');
  if (fs.existsSync(agentsDir) && fs.statSync(agentsDir).isDirectory()) {
    const agentFiles = fs.readdirSync(agentsDir);
    for (const agentFile of agentFiles) {
      artifacts.push({
        path: `.cursor/agents/${agentFile}`,
        format: 'cursor-agent',
        classification: MigrationClassification.UNSUPPORTED,
      });
    }
    warnings.push({
      severity: 'info',
      message: `Found ${agentFiles.length} Cursor custom agent(s) - not supported in Agent Plugins v1`,
      component: 'agents',
    });
  }

  const plugin: PortablePlugin = {
    metadata: {
      name: 'migrated-plugin',
      description: 'Migrated from Cursor',
    },
    skills,
    mcpServers,
    extensions: [],
    sourceArtifacts: artifacts,
    migrationWarnings: warnings,
  };

  return { plugin, artifacts, warnings };
}
