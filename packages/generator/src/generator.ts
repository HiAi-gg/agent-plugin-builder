import type { PortablePlugin } from '@agent-plugin-builder/core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { writePluginJson } from './plugin-json.ts';
import { writeMcpJson } from './mcp-json.ts';
import { writeSkills } from './skills.ts';
import { writeExtensions } from './extensions.ts';

export interface GeneratePluginOptions {
  plugin: PortablePlugin;
  outputDir: string;
  dryRun?: boolean;
  force?: boolean;
}

export interface GenerateResult {
  filesCreated: string[];
  filesSkipped: string[];
  warnings: string[];
}

export function generatePlugin(options: GeneratePluginOptions): GenerateResult {
  const { plugin, outputDir, dryRun = false, force = false } = options;

  const filesCreated: string[] = [];
  const filesSkipped: string[] = [];
  const warnings: string[] = [];

  // Check if output directory exists
  if (fs.existsSync(outputDir)) {
    if (!force && !dryRun) {
      const existingFiles = fs.readdirSync(outputDir);
      if (existingFiles.length > 0) {
        throw new Error(
          `Output directory ${outputDir} is not empty. Use --force to overwrite or --dry-run to preview.`
        );
      }
    }
  }

  // Create output directory
  if (!dryRun) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write plugin.json
  const pluginJsonPath = path.join(outputDir, 'plugin.json');
  if (dryRun) {
    filesCreated.push(pluginJsonPath);
  } else {
    writePluginJson({ metadata: plugin.metadata, outputDir });
    filesCreated.push(pluginJsonPath);
  }

  // Write mcp.json if there are MCP servers
  if (plugin.mcpServers.length > 0) {
    const mcpJsonPath = path.join(outputDir, 'mcp.json');
    if (dryRun) {
      filesCreated.push(mcpJsonPath);
    } else {
      writeMcpJson({ servers: plugin.mcpServers, outputDir });
      filesCreated.push(mcpJsonPath);
    }
  }

  // Write skills if there are any
  if (plugin.skills.length > 0) {
    const skillsDir = path.join(outputDir, 'skills');
    if (dryRun) {
      plugin.skills.forEach((skill) => {
        filesCreated.push(path.join(skillsDir, skill.name, 'SKILL.md'));
      });
    } else {
      writeSkills({ skills: plugin.skills, outputDir });
      plugin.skills.forEach((skill) => {
        filesCreated.push(path.join(skillsDir, skill.name, 'SKILL.md'));
      });
    }
  }

  // Write extensions if there are any
  if (plugin.extensions.length > 0) {
    if (dryRun) {
      plugin.extensions.forEach((ext) => {
        filesCreated.push(path.join(outputDir, ext.namespace, 'extension.json'));
      });
    } else {
      writeExtensions({ extensions: plugin.extensions, outputDir });
      plugin.extensions.forEach((ext) => {
        filesCreated.push(path.join(outputDir, ext.namespace, 'extension.json'));
      });
    }
  }

  // Write AGENTS.md if instructions are present
  if (plugin.instructions) {
    const agentsMdPath = path.join(outputDir, 'AGENTS.md');
    if (dryRun) {
      filesCreated.push(agentsMdPath);
    } else {
      fs.writeFileSync(agentsMdPath, plugin.instructions, 'utf-8');
      filesCreated.push(agentsMdPath);
    }
  }

  // Add migration warnings
  warnings.push(...plugin.migrationWarnings.map((w) => w.message));

  return {
    filesCreated,
    filesSkipped,
    warnings,
  };
}
