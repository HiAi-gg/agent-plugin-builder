import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { pluginJsonSchema, mcpJsonSchema, skillFrontmatterSchema } from '@agent-plugin-builder/core';

export const packageCommand = new Command('package')
  .description('Validate and package an Agent Plugin')
  .argument('<plugin-dir>', 'Plugin directory to package')
  .option('--output <dir>', 'Output directory for packaged plugin')
  .option('--dry-run', 'Validate only, do not copy')
  .action(async (pluginDir: string, options: any) => {
    const pluginPath = path.resolve(pluginDir);

    if (!fs.existsSync(pluginPath)) {
      console.error(`Plugin directory not found: ${pluginPath}`);
      process.exit(1);
    }

    console.log(`Validating plugin in ${pluginPath}...`);

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate plugin.json
    const pluginJsonPath = path.join(pluginPath, 'plugin.json');
    if (!fs.existsSync(pluginJsonPath)) {
      errors.push('Missing required file: plugin.json');
    } else {
      try {
        const pluginJsonContent = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf-8'));
        const result = pluginJsonSchema.safeParse(pluginJsonContent);
        if (!result.success) {
          errors.push(`plugin.json validation failed:`);
          result.error.issues.forEach((issue) => {
            errors.push(`  - ${issue.path.join('.')}: ${issue.message}`);
          });
        } else {
          console.log('✓ plugin.json is valid');
        }
      } catch (error) {
        errors.push(`Failed to parse plugin.json: ${error}`);
      }
    }

    // Validate mcp.json if present
    const mcpJsonPath = path.join(pluginPath, 'mcp.json');
    if (fs.existsSync(mcpJsonPath)) {
      try {
        const mcpJsonContent = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf-8'));
        const result = mcpJsonSchema.safeParse(mcpJsonContent);
        if (!result.success) {
          errors.push(`mcp.json validation failed:`);
          result.error.issues.forEach((issue) => {
            errors.push(`  - ${issue.path.join('.')}: ${issue.message}`);
          });
        } else {
          console.log('✓ mcp.json is valid');
        }
      } catch (error) {
        errors.push(`Failed to parse mcp.json: ${error}`);
      }
    }

    // Validate skills
    const skillsDir = path.join(pluginPath, 'skills');
    if (fs.existsSync(skillsDir) && fs.statSync(skillsDir).isDirectory()) {
      const skillDirs = fs.readdirSync(skillsDir);
      for (const skillDir of skillDirs) {
        const skillMdPath = path.join(skillsDir, skillDir, 'SKILL.md');
        if (!fs.existsSync(skillMdPath)) {
          warnings.push(`Skill directory ${skillDir} is missing SKILL.md`);
          continue;
        }

        try {
          const content = fs.readFileSync(skillMdPath, 'utf-8');
          // Parse frontmatter
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

          // Simple YAML parsing for name and description
          const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
          const descMatch = frontmatter.match(/^description:\s*(.+)$/m);

          if (!nameMatch || !descMatch) {
            errors.push(`Skill ${skillDir}/SKILL.md is missing required frontmatter fields`);
          } else {
            const frontmatterObj = {
              name: nameMatch[1].trim().replace(/^["']|["']$/g, ''),
              description: descMatch[1].trim().replace(/^["']|["']$/g, ''),
            };

            const result = skillFrontmatterSchema.safeParse(frontmatterObj);
            if (!result.success) {
              errors.push(`Skill ${skillDir}/SKILL.md validation failed:`);
              result.error.issues.forEach((issue) => {
                errors.push(`  - ${issue.path.join('.')}: ${issue.message}`);
              });
            } else {
              console.log(`✓ Skill ${skillDir} is valid`);
            }
          }
        } catch (error) {
          errors.push(`Failed to parse ${skillDir}/SKILL.md: ${error}`);
        }
      }
    }

    // Report results
    if (errors.length > 0) {
      console.log('\n❌ Validation failed:');
      errors.forEach((error) => console.log(`  ${error}`));
      process.exit(2);
    }

    if (warnings.length > 0) {
      console.log('\n⚠ Warnings:');
      warnings.forEach((warning) => console.log(`  ${warning}`));
    }

    console.log('\n✓ Plugin is valid');

    // Copy to output if specified
    if (options.output && !options.dryRun) {
      const outputPath = path.resolve(options.output);
      console.log(`\nPackaging to ${outputPath}...`);

      // Simple recursive copy
      function copyDir(src: string, dest: string) {
        fs.mkdirSync(dest, { recursive: true });
        const entries = fs.readdirSync(src, { withFileTypes: true });
        for (const entry of entries) {
          const srcPath = path.join(src, entry.name);
          const destPath = path.join(dest, entry.name);
          if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      }

      copyDir(pluginPath, outputPath);
      console.log(`✓ Packaged to ${outputPath}`);
    }
  });
