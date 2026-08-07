import { Command } from 'commander';
import prompts from 'prompts';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { writePluginJson, writeSkills, writeMcpJson } from '@agent-plugin-builder/generator';
import type { PluginMetadata, PortableSkill, PortableMcpServer } from '@agent-plugin-builder/core';

export const initCommand = new Command('init')
  .description('Create a new Agent Plugin interactively')
  .argument('[directory]', 'Target directory', '.')
  .option('--name <name>', 'Plugin name')
  .option('--description <description>', 'Plugin description')
  .option('--yes', 'Skip prompts and use defaults')
  .action(async (directory: string, options: any) => {
    const outputDir = path.resolve(directory);

    let metadata: PluginMetadata;
    let skills: PortableSkill[] = [];
    let mcpServers: PortableMcpServer[] = [];

    if (options.yes || process.env.CI) {
      // Non-interactive mode
      metadata = {
        name: options.name || 'my-plugin',
        description: options.description || 'An Agent Plugin',
      };
    } else {
      // Interactive mode
      const responses = await prompts([
        {
          type: 'text',
          name: 'name',
          message: 'Plugin name:',
          initial: options.name || 'my-plugin',
          validate: (value: string) =>
            /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(value) || 'Invalid name format',
        },
        {
          type: 'text',
          name: 'description',
          message: 'Description:',
          initial: options.description || 'An Agent Plugin',
        },
        {
          type: 'confirm',
          name: 'includeSkills',
          message: 'Include skills?',
          initial: true,
        },
        {
          type: 'confirm',
          name: 'includeMcp',
          message: 'Include MCP server?',
          initial: false,
        },
      ]);

      metadata = {
        name: responses.name,
        description: responses.description,
      };

      if (responses.includeSkills) {
        skills.push({
          name: 'example-skill',
          description: 'An example skill',
          body: '# Example Skill\n\nThis is an example skill.',
        });
      }

      if (responses.includeMcp) {
        mcpServers.push({
          type: 'stdio',
          command: 'node',
          args: ['server.js'],
        });
      }
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
