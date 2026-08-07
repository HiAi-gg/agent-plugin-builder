import { Command } from 'commander';
import prompts from 'prompts';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { generatePlugin } from '@agent-plugin-builder/generator';
import {
  parseConfigFile,
  configToPortablePlugin,
  NAME_PATTERN,
  NAME_MAX_LENGTH,
} from '@agent-plugin-builder/core';
import type {
  PluginMetadata,
  PortablePlugin,
  PortableSkill,
  PortableMcpServer,
} from '@agent-plugin-builder/core';

const DEFAULT_NAME = 'my-plugin';
const DEFAULT_DESCRIPTION = 'An Agent Plugin';
const DEFAULT_VERSION = '0.1.0';
const DEFAULT_LICENSE = 'MIT';
const EXAMPLE_SKILL = 'example-skill';

// Skill names become directory names (skills/<name>/SKILL.md) so they are
// stricter than plugin names: lowercase alphanumerics and hyphens only.
const SKILL_NAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const SKILL_NAME_MAX_LENGTH = 64;

const MCP_TYPES = ['stdio', 'streamable-http', 'sse'] as const;
type McpType = (typeof MCP_TYPES)[number];

export interface InitAnswers {
  name: string;
  description?: string;
  version?: string;
  authorName?: string;
  authorEmail?: string;
  license?: string;
  skills: PortableSkill[];
  mcpServers: PortableMcpServer[];
  generateReadme: boolean;
  generateLicense: boolean;
  outputDir: string;
}

export function validatePluginName(value: string): true | string {
  const name = value.trim();
  if (name.length === 0) return 'Plugin name is required';
  if (name.length > NAME_MAX_LENGTH) {
    return `Plugin name must be ${NAME_MAX_LENGTH} characters or fewer`;
  }
  if (!NAME_PATTERN.test(name)) {
    return 'Invalid name: 1-64 lowercase letters, digits, dots, and hyphens (no -- or .., must start and end with a letter or digit)';
  }
  return true;
}

function validateSkillName(value: string): true | string {
  const name = value.trim();
  if (name.length === 0) return 'Skill name is required';
  if (name.length > SKILL_NAME_MAX_LENGTH) {
    return `Skill name must be ${SKILL_NAME_MAX_LENGTH} characters or fewer`;
  }
  if (!SKILL_NAME_PATTERN.test(name)) {
    return 'Invalid skill name: 1-64 lowercase letters, digits, and hyphens';
  }
  return true;
}

export function parseCommaSeparated(input: string): string[] | undefined {
  const parts = input
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

export function parseEnvPairs(
  input: string,
): Record<string, string> | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  const env: Record<string, string> = {};
  for (const pair of trimmed.split(',')) {
    const separatorIndex = pair.indexOf('=');
    if (separatorIndex === -1) {
      throw new Error(
        `Invalid environment variable "${pair.trim()}". Expected KEY=VALUE.`,
      );
    }
    env[pair.slice(0, separatorIndex).trim()] = pair
      .slice(separatorIndex + 1)
      .trim();
  }
  return env;
}

function validateEnvPairs(value: string): true | string {
  const trimmed = value.trim();
  if (!trimmed) return true;
  try {
    parseEnvPairs(trimmed);
    return true;
  } catch (error) {
    return (error as Error).message;
  }
}

export function defaultSkillBody(name: string): string {
  const title = name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  return `# ${title}\n\nDescribe what this skill does and when to use it.\n`;
}

export function buildPortablePlugin(answers: InitAnswers): PortablePlugin {
  const metadata: PluginMetadata = { name: answers.name };
  if (answers.description) metadata.description = answers.description;
  if (answers.version) metadata.version = answers.version;
  if (answers.license) metadata.license = answers.license;
  if (answers.authorName || answers.authorEmail) {
    metadata.author = {
      ...(answers.authorName ? { name: answers.authorName } : {}),
      ...(answers.authorEmail ? { email: answers.authorEmail } : {}),
    };
  }

  const plugin: PortablePlugin = {
    metadata,
    skills: answers.skills,
    mcpServers: answers.mcpServers,
    extensions: [],
    sourceArtifacts: [],
    migrationWarnings: [],
  };

  if (answers.generateReadme) plugin._generateReadme = true;
  if (answers.generateLicense)
    plugin._licenseType = answers.license || DEFAULT_LICENSE;

  return plugin;
}

/**
 * Non-interactive defaults: the same values a user gets by pressing Enter
 * through the wizard (one example skill, no MCP, README + LICENSE).
 */
export function defaultAnswers(opts: any, positionalDir?: string): InitAnswers {
  const name = opts.name || DEFAULT_NAME;
  const nameError = validatePluginName(name);
  if (nameError !== true) {
    throw new Error(`Invalid plugin name "${name}": ${nameError}`);
  }
  return {
    name,
    description: opts.description || DEFAULT_DESCRIPTION,
    version: opts.version || DEFAULT_VERSION,
    authorName: opts.authorName,
    authorEmail: opts.authorEmail,
    license: opts.license || DEFAULT_LICENSE,
    skills: [
      {
        name: EXAMPLE_SKILL,
        description: 'An example skill',
        body: defaultSkillBody(EXAMPLE_SKILL),
      },
    ],
    mcpServers: [],
    generateReadme: true,
    generateLicense: true,
    outputDir: positionalDir || `./${name}`,
  };
}

async function askSkills(onCancel: () => void): Promise<PortableSkill[]> {
  const skills: PortableSkill[] = [];
  const { addSkill } = await prompts(
    {
      type: 'confirm',
      name: 'addSkill',
      message: 'Add a Skill?',
      initial: true,
    },
    { onCancel },
  );

  while (addSkill) {
    const skill = await prompts(
      [
        {
          type: 'text',
          name: 'name',
          message: 'Skill name:',
          validate: validateSkillName,
        },
        {
          type: 'text',
          name: 'description',
          message: 'Skill description:',
          validate: (value: string) =>
            value.trim().length > 0 || 'Skill description is required',
        },
        {
          type: 'text',
          name: 'bodyFile',
          message: 'Skill body file (optional, Enter for template):',
        },
      ],
      { onCancel },
    );

    let body: string;
    if (skill.bodyFile && skill.bodyFile.trim()) {
      const bodyPath = path.resolve(skill.bodyFile.trim());
      if (!fs.existsSync(bodyPath)) {
        console.error(
          `✗ Body file not found: ${bodyPath} — using template instead.`,
        );
        body = defaultSkillBody(skill.name);
      } else {
        body = fs.readFileSync(bodyPath, 'utf-8');
      }
    } else {
      body = defaultSkillBody(skill.name);
    }

    skills.push({
      name: skill.name.trim(),
      description: skill.description.trim(),
      body,
    });

    const { addAnother } = await prompts(
      {
        type: 'confirm',
        name: 'addAnother',
        message: 'Add another Skill?',
        initial: true,
      },
      { onCancel },
    );
    if (!addAnother) break;
  }

  return skills;
}

async function askMcpServers(
  onCancel: () => void,
): Promise<PortableMcpServer[]> {
  const mcpServers: PortableMcpServer[] = [];
  const { addMcp } = await prompts(
    {
      type: 'confirm',
      name: 'addMcp',
      message: 'Add an MCP server?',
      initial: false,
    },
    { onCancel },
  );

  while (addMcp) {
    const server = await prompts(
      [
        {
          type: 'text',
          name: 'name',
          message: 'Server name:',
          initial: `server-${mcpServers.length + 1}`,
        },
        {
          type: 'text',
          name: 'type',
          message: 'Type (stdio / streamable-http / sse):',
          initial: 'stdio',
          validate: (value: string) =>
            (MCP_TYPES as readonly string[]).includes(value.trim()) ||
            'Must be stdio, streamable-http, or sse',
        },
      ],
      { onCancel },
    );

    const type = server.type.trim() as McpType;
    let built: PortableMcpServer;
    if (type === 'stdio') {
      const details = await prompts(
        [
          {
            type: 'text',
            name: 'command',
            message: 'Command:',
            validate: (value: string) =>
              value.trim().length > 0 || 'Command is required',
          },
          {
            type: 'text',
            name: 'args',
            message: 'Args (comma-separated, optional):',
          },
          {
            type: 'text',
            name: 'env',
            message:
              'Environment variables (KEY=VALUE, comma-separated, optional):',
            validate: validateEnvPairs,
          },
        ],
        { onCancel },
      );
      built = {
        type: 'stdio',
        command: details.command.trim(),
        args: parseCommaSeparated(details.args),
        env: parseEnvPairs(details.env),
        _name: server.name.trim(),
      };
    } else {
      const details = await prompts(
        [
          {
            type: 'text',
            name: 'url',
            message: 'URL:',
            validate: (value: string) =>
              value.trim().length > 0 || 'URL is required',
          },
        ],
        { onCancel },
      );
      built = { type, url: details.url.trim(), _name: server.name.trim() };
    }
    mcpServers.push(built);

    const { addAnother } = await prompts(
      {
        type: 'confirm',
        name: 'addAnother',
        message: 'Add another MCP server?',
        initial: false,
      },
      { onCancel },
    );
    if (!addAnother) break;
  }

  return mcpServers;
}

async function runWizard(
  initial: { name?: string; description?: string },
  positionalDir?: string,
): Promise<InitAnswers> {
  const onCancel = () => {
    console.log('\nAborted.');
    process.exit(0);
  };

  const base = await prompts(
    [
      {
        type: 'text',
        name: 'name',
        message: 'Plugin name:',
        initial: initial.name || DEFAULT_NAME,
        validate: validatePluginName,
      },
      {
        type: 'text',
        name: 'description',
        message: 'Description:',
        initial: initial.description || DEFAULT_DESCRIPTION,
      },
      {
        type: 'text',
        name: 'version',
        message: 'Version:',
        initial: DEFAULT_VERSION,
      },
      {
        type: 'text',
        name: 'authorName',
        message: 'Author name:',
        initial: '',
      },
      {
        type: 'text',
        name: 'authorEmail',
        message: 'Author email (optional):',
        initial: '',
      },
      {
        type: 'text',
        name: 'license',
        message: 'License:',
        initial: DEFAULT_LICENSE,
      },
    ],
    { onCancel },
  );

  const skills = await askSkills(onCancel);
  const mcpServers = await askMcpServers(onCancel);

  const extras = await prompts(
    [
      {
        type: 'confirm',
        name: 'readme',
        message: 'Generate README?',
        initial: true,
      },
      {
        type: 'confirm',
        name: 'license',
        message: 'Generate LICENSE?',
        initial: true,
      },
      {
        type: 'text',
        name: 'outputDir',
        message: 'Output directory:',
        initial: positionalDir || `./${base.name}`,
      },
    ],
    { onCancel },
  );

  return {
    name: base.name.trim(),
    description: base.description.trim() || undefined,
    version: base.version.trim() || undefined,
    authorName: base.authorName.trim() || undefined,
    authorEmail: base.authorEmail.trim() || undefined,
    license: base.license.trim() || undefined,
    skills,
    mcpServers,
    generateReadme: extras.readme,
    generateLicense: extras.license,
    outputDir: extras.outputDir.trim() || positionalDir || `./${base.name}`,
  };
}

export const initCommand = new Command('init')
  .description('Create a new Agent Plugin interactively')
  .argument('[directory]', 'Output directory (defaults to ./<plugin-name>)')
  .option('--name <name>', 'Plugin name')
  .option('--description <description>', 'Plugin description')
  .option('--version <version>', 'Plugin version')
  .option('--author-name <name>', 'Author name')
  .option('--author-email <email>', 'Author email')
  .option('--license <spdx>', 'Plugin license (SPDX identifier)')
  .option(
    '--config <file>',
    'Declarative plugin config file (plugin.yml); skips prompts',
  )
  .option('--yes', 'Skip prompts and use defaults')
  .option('--non-interactive', 'Non-interactive mode (same as --yes)')
  .action(
    async (directory: string | undefined, _options: any, command: Command) => {
      const opts = command.optsWithGlobals();

      // Declarative config path — no prompts at all
      if (opts.config) {
        const configPath = path.resolve(opts.config);
        const config = parseConfigFile(configPath);
        const plugin = configToPortablePlugin(config, path.dirname(configPath));
        const outputDir = path.resolve(directory || `./${config.name}`);
        const result = generatePlugin({ plugin, outputDir });
        console.log(`✓ Created Agent Plugin in ${outputDir}`);
        console.log(`  Created ${result.filesCreated.length} files`);
        return;
      }

      const nonInteractive =
        opts.yes || opts.nonInteractive || !!process.env.CI;

      let answers: InitAnswers;
      if (nonInteractive) {
        answers = defaultAnswers(opts, directory);
      } else {
        answers = await runWizard(
          { name: opts.name, description: opts.description },
          directory,
        );
      }

      const outputDir = path.resolve(answers.outputDir);
      const plugin = buildPortablePlugin(answers);

      // Preview (interactive only)
      if (!nonInteractive) {
        const preview = generatePlugin({ plugin, outputDir, dryRun: true });
        console.log('\nPreview:');
        preview.filesCreated.forEach((file) => {
          const rel = path.relative(outputDir, file) || path.basename(file);
          console.log(`  ${rel}`);
        });

        const { generate } = await prompts(
          {
            type: 'confirm',
            name: 'generate',
            message: 'Generate?',
            initial: true,
          },
          { onCancel: () => process.exit(0) },
        );
        if (!generate) {
          console.log('Aborted. No files were created.');
          return;
        }
      }

      const result = generatePlugin({ plugin, outputDir, force: opts.force });
      console.log(`✓ Created Agent Plugin in ${outputDir}`);
      console.log(`  Created ${result.filesCreated.length} files`);
      if (result.warnings.length > 0) {
        result.warnings.forEach((warning) => console.log(`  ⚠ ${warning}`));
      }
    },
  );
