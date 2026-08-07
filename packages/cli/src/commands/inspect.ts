import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const inspectCommand = new Command('inspect')
  .description('Inspect an Agent Plugin')
  .argument('<plugin-dir>', 'Plugin directory to inspect')
  .option('--json', 'Output as JSON')
  .action(async (pluginDir: string, options: any) => {
    const pluginPath = path.resolve(pluginDir);

    if (!fs.existsSync(pluginPath)) {
      console.error(`Plugin directory not found: ${pluginPath}`);
      process.exit(1);
    }

    const pluginJsonPath = path.join(pluginPath, 'plugin.json');
    if (!fs.existsSync(pluginJsonPath)) {
      console.error(`Not an Agent Plugin: missing plugin.json`);
      process.exit(1);
    }

    const pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf-8'));

    // Collect information
    const info: any = {
      name: pluginJson.name,
      version: pluginJson.version,
      description: pluginJson.description,
      author: pluginJson.author,
      license: pluginJson.license,
      skills: [],
      mcpServers: [],
      extensions: [],
    };

    // Read skills
    const skillsDir = path.join(pluginPath, 'skills');
    if (fs.existsSync(skillsDir) && fs.statSync(skillsDir).isDirectory()) {
      const skillDirs = fs.readdirSync(skillsDir);
      for (const skillDir of skillDirs) {
        const skillMdPath = path.join(skillsDir, skillDir, 'SKILL.md');
        if (fs.existsSync(skillMdPath)) {
          const content = fs.readFileSync(skillMdPath, 'utf-8');
          const lines = content.split('\n');
          let inFrontmatter = false;
          let frontmatter = '';

          for (const line of lines) {
            if (line.trim() === '---') {
              if (!inFrontmatter) {
                inFrontmatter = true;
                continue;
              } else {
                break;
              }
            }
            if (inFrontmatter) {
              frontmatter += line + '\n';
            }
          }

          const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
          const descMatch = frontmatter.match(/^description:\s*(.+)$/m);

          info.skills.push({
            name: nameMatch?.[1]?.trim() || skillDir,
            description: descMatch?.[1]?.trim() || '',
          });
        }
      }
    }

    // Read MCP servers
    const mcpJsonPath = path.join(pluginPath, 'mcp.json');
    if (fs.existsSync(mcpJsonPath)) {
      const mcpJson = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf-8'));
      if (mcpJson.mcpServers) {
        for (const [name, server] of Object.entries(mcpJson.mcpServers)) {
          const serverConfig = server as any;
          info.mcpServers.push({
            name,
            type: serverConfig.type,
            command: serverConfig.command,
            url: serverConfig.url,
          });
        }
      }
    }

    // Read extensions
    if (pluginJson.extensions) {
      for (const namespace of Object.keys(pluginJson.extensions)) {
        info.extensions.push({ namespace });
      }
    }

    // Output
    if (options.json) {
      console.log(JSON.stringify(info, null, 2));
    } else {
      console.log(`\nPlugin: ${info.name}`);
      if (info.version) console.log(`Version: ${info.version}`);
      if (info.description) console.log(`Description: ${info.description}`);
      if (info.author) console.log(`Author: ${JSON.stringify(info.author)}`);
      if (info.license) console.log(`License: ${info.license}`);

      console.log(`\nSkills (${info.skills.length}):`);
      if (info.skills.length === 0) {
        console.log('  (none)');
      } else {
        info.skills.forEach((skill: any) => {
          console.log(`  - ${skill.name}: ${skill.description}`);
        });
      }

      console.log(`\nMCP Servers (${info.mcpServers.length}):`);
      if (info.mcpServers.length === 0) {
        console.log('  (none)');
      } else {
        info.mcpServers.forEach((server: any) => {
          if (server.type === 'stdio') {
            console.log(`  - ${server.name} (${server.type}): ${server.command}`);
          } else {
            console.log(`  - ${server.name} (${server.type}): ${server.url}`);
          }
        });
      }

      console.log(`\nExtensions (${info.extensions.length}):`);
      if (info.extensions.length === 0) {
        console.log('  (none)');
      } else {
        info.extensions.forEach((ext: any) => {
          console.log(`  - ${ext.namespace}`);
        });
      }
    }
  });
