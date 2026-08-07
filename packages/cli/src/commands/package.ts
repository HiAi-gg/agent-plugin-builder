import { Command, Option } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ZipArchive, TarArchive, type Archiver } from 'archiver';
import { pluginJsonSchema, mcpJsonSchema, skillFrontmatterSchema } from '@agent-plugin-builder/core';

interface ValidationResult {
  pluginJson?: Record<string, unknown>;
  errors: string[];
  warnings: string[];
}

function validatePlugin(pluginPath: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let pluginJson: Record<string, unknown> | undefined;

  console.log(`Validating plugin in ${pluginPath}...`);

  // Validate plugin.json
  const pluginJsonPath = path.join(pluginPath, 'plugin.json');
  if (!fs.existsSync(pluginJsonPath)) {
    errors.push('Missing required file: plugin.json');
  } else {
    try {
      pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf-8'));
      const result = pluginJsonSchema.safeParse(pluginJson);
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

  return { pluginJson, errors, warnings };
}

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

/**
 * Write a plugin directory into an archive file, with the plugin name as the
 * root folder inside the archive (e.g. `<name>/plugin.json`).
 *
 * Resolves once the output file has been fully flushed to disk ('close'),
 * or rejects on any archive or stream error.
 */
function writeArchive(
  archive: Archiver,
  destPath: string,
  pluginPath: string,
  pluginName: string,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(destPath);
    let settled = false;
    const settle = (fn: () => void) => {
      if (!settled) {
        settled = true;
        fn();
      }
    };

    output.once('close', () => settle(resolve));
    output.once('error', (err) => settle(() => reject(err)));
    archive.on('error', (err) => settle(() => reject(err)));
    archive.on('warning', (err) => console.warn(`  ⚠ ${err.message}`));

    archive.pipe(output);
    archive.directory(pluginPath, pluginName);
    // Errors are surfaced through the 'error' listener above; swallow the
    // rejected finalize() promise to avoid an unhandled rejection.
    archive.finalize().catch(() => {});
  });
}

export const packageCommand = new Command('package')
  .description('Validate an Agent Plugin and package it as an archive (zip, tar.gz, or directory)')
  .argument('<plugin-dir>', 'Plugin directory to package')
  .addOption(
    new Option('--format <format>', 'Packaging format')
      .choices(['zip', 'tar.gz', 'dir'])
      .default('zip')
  )
  .option('--output <dir>', 'Output directory for the packaged plugin (default: current directory)')
  .option('--dry-run', 'Validate only, do not create an archive')
  .action(async (pluginDir: string, _options: any, command: Command) => {
    // The parent program also declares --dry-run/--force/--non-interactive as
    // global options, and commander parses those at the parent level even when
    // they appear after the subcommand name. optsWithGlobals() merges the
    // parent options in, so the flags work in both positions.
    const options = command.optsWithGlobals();

    const pluginPath = path.resolve(pluginDir);

    if (!fs.existsSync(pluginPath)) {
      console.error(`Plugin directory not found: ${pluginPath}`);
      process.exit(1);
    }

    const { pluginJson, errors, warnings } = validatePlugin(pluginPath);

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

    if (options.dryRun) {
      console.log('Dry run: validation only, no archive created');
      return;
    }

    const format: string = options.format;
    const pluginName =
      typeof pluginJson?.name === 'string' ? pluginJson.name : path.basename(pluginPath);

    const outputDir = options.output ? path.resolve(options.output) : process.cwd();
    fs.mkdirSync(outputDir, { recursive: true });

    if (format === 'dir') {
      // Directory copy keeps the previous behavior: plugin contents are copied
      // into the output directory (or a folder named after the plugin when no
      // --output is given).
      const destDir = options.output ? outputDir : path.join(outputDir, pluginName);
      console.log(`\nPackaging to ${destDir}...`);
      copyDir(pluginPath, destDir);
      console.log(`✓ Packaged to ${destDir}`);
      return;
    }

    const extension = format === 'tar.gz' ? 'tar.gz' : 'zip';
    const destPath = path.join(outputDir, `${pluginName}.${extension}`);
    const archive =
      format === 'tar.gz'
        ? new TarArchive({ gzip: true, gzipOptions: { level: 9 } })
        : new ZipArchive({ zlib: { level: 9 } });

    console.log(`\nPackaging ${pluginName} as ${extension} to ${destPath}...`);
    await writeArchive(archive, destPath, pluginPath, pluginName);
    console.log(`✓ Packaged: ${destPath}`);
  });
