import type { PortablePlugin } from '@agent-plugins-builder/core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { writePluginJson } from './plugin-json.ts';
import { writeMcpJson } from './mcp-json.ts';
import { writeSkills } from './skills.ts';
import { writeExtensions } from './extensions.ts';
import { getLicenseText } from './licenses.ts';

export interface GeneratePluginOptions {
  plugin: PortablePlugin;
  outputDir: string;
  dryRun?: boolean;
  force?: boolean;
  generateReadme?: boolean;
  licenseType?: string;
}

export interface GenerateResult {
  filesCreated: string[];
  filesSkipped: string[];
  warnings: string[];
}

export function generatePlugin(options: GeneratePluginOptions): GenerateResult {
  const { plugin, outputDir, dryRun = false, force = false } = options;

  const generateReadme = options.generateReadme ?? plugin._generateReadme ?? false;
  const licenseType = options.licenseType ?? plugin._licenseType;

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

  // Write README.md scaffold if requested
  if (generateReadme) {
    const readmePath = path.join(outputDir, 'README.md');
    if (dryRun) {
      filesCreated.push(readmePath);
    } else {
      fs.writeFileSync(readmePath, generateReadmeContent(plugin, licenseType), 'utf-8');
      filesCreated.push(readmePath);
    }
  }

  // Write LICENSE if a license type is requested
  if (licenseType) {
    const licensePath = path.join(outputDir, 'LICENSE');
    if (dryRun) {
      filesCreated.push(licensePath);
    } else {
      const holder =
        plugin.metadata.author?.name || `${plugin.metadata.name} authors`;
      const year = new Date().getFullYear();
      fs.writeFileSync(licensePath, getLicenseText(licenseType, holder, year) + '\n', 'utf-8');
      filesCreated.push(licensePath);
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

export function generateReadmeContent(plugin: PortablePlugin, licenseType?: string): string {
  const { metadata } = plugin;
  const lines: string[] = [];

  lines.push(`# ${metadata.name}`);
  lines.push('');
  if (metadata.description) {
    lines.push(metadata.description);
    lines.push('');
  }

  lines.push('## Overview');
  lines.push('');
  lines.push('An Agent Plugin generated with [Agent Plugins Builder](https://agent-plugins.org/).');
  lines.push('');

  lines.push('## Contents');
  lines.push('');
  lines.push('- `plugin.json` — plugin manifest');
  if (plugin.skills.length > 0) lines.push('- `skills/` — skills');
  if (plugin.mcpServers.length > 0) lines.push('- `mcp.json` — MCP servers');
  if (plugin.extensions.length > 0) lines.push('- `extensions/` — extension data');
  if (plugin.instructions) lines.push('- `AGENTS.md` — shared instructions');
  lines.push('');

  if (plugin.skills.length > 0) {
    lines.push('## Skills');
    lines.push('');
    plugin.skills.forEach((skill) => {
      lines.push(`- \`${skill.name}\` — ${skill.description}`);
    });
    lines.push('');
  }

  if (plugin.mcpServers.length > 0) {
    lines.push('## MCP Servers');
    lines.push('');
    plugin.mcpServers.forEach((server) => {
      const name = server._name || `${server.type} server`;
      lines.push(`- \`${name}\` — ${server.type}`);
    });
    lines.push('');
  }

  if (metadata.homepage || metadata.repository) {
    lines.push('## Links');
    lines.push('');
    if (metadata.homepage) lines.push(`- Homepage: ${metadata.homepage}`);
    if (metadata.repository) lines.push(`- Repository: ${metadata.repository}`);
    lines.push('');
  }

  const effectiveLicense = licenseType ?? metadata.license;
  if (effectiveLicense) {
    lines.push('## License');
    lines.push('');
    lines.push(`Licensed under the ${effectiveLicense} license.`);
    lines.push('');
  }

  return lines.join('\n');
}
