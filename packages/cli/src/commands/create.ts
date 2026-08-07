import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { writePluginJson, writeSkills, writeMcpJson } from '@agent-plugin-builder/generator';
import type { PluginMetadata, PortableSkill, PortableMcpServer } from '@agent-plugin-builder/core';

export const createCommand = new Command('create')
  .description('Create an Agent Plugin from flags')
  .requiredOption('--name <name>', 'Plugin name')
  .option('--description <description>', 'Plugin description', 'An Agent Plugin')
  .option('--output <directory>', 'Output directory', '.')
  .option('--skills-only', 'Create skills-only plugin')
  .option('--mcp-only', 'Create MCP-only plugin')
  .option('--skill-name <name>', 'Skill name (for skills-only)')
  .option('--skill-description <description>', 'Skill description')
  .option('--mcp-type <type>', 'MCP server type: stdio, streamable-http, sse')
  .option('--mcp-command <command>', 'MCP command (for stdio)')
  .option('--mcp-url <url>', 'MCP URL (for streamable-http or sse)')
  .action(async (options: any) => {
    const outputDir = path.resolve(options.output);

    const metadata: PluginMetadata = {
      name: options.name,
      description: options.description,
    };

    const skills: PortableSkill[] = [];
    const mcpServers: PortableMcpServer[] = [];

    if (options.skillsOnly) {
      // Skills-only plugin
      skills.push({
        name: options.skillName || 'example-skill',
        description: options.skillDescription || 'An example skill',
        body: `# ${options.skillName || 'Example Skill'}\n\nThis is a skill.`,
      });
    } else if (options.mcpOnly) {
      // MCP-only plugin
      if (!options.mcpType) {
        throw new Error('--mcp-type is required for --mcp-only');
      }

      if (options.mcpType === 'stdio') {
        if (!options.mcpCommand) {
          throw new Error('--mcp-command is required for stdio MCP server');
        }
        mcpServers.push({
          type: 'stdio',
          command: options.mcpCommand,
        });
      } else if (options.mcpType === 'streamable-http' || options.mcpType === 'sse') {
        if (!options.mcpUrl) {
          throw new Error(`--mcp-url is required for ${options.mcpType} MCP server`);
        }
        mcpServers.push({
          type: options.mcpType,
          url: options.mcpUrl,
        });
      } else {
        throw new Error(`Invalid MCP type: ${options.mcpType}`);
      }
    } else {
      // Default: create a basic plugin with one skill
      skills.push({
        name: 'example-skill',
        description: 'An example skill',
        body: '# Example Skill\n\nThis is an example skill.',
      });
    }

    // Create output directory
    fs.mkdirSync(outputDir, { recursive: true });

    // Write files
    writePluginJson({ metadata, outputDir });

    if (skills.length > 0) {
      writeSkills({ skills, outputDir });
    }

    if (mcpServers.length > 0) {
      writeMcpJson({ servers: mcpServers, outputDir });
    }

    console.log(`✓ Created Agent Plugin in ${outputDir}`);
  });
