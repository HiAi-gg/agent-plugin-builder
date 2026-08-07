import { Command } from 'commander';
import { initCommand } from './commands/init';
import { createCommand } from './commands/create';
import { migrateCommand } from './commands/migrate';
import { inspectCommand } from './commands/inspect';
import { packageCommand } from './commands/package';

export function run() {
  const program = new Command();

  program
    .name('agent-plugin')
    .description('Create, migrate, package, and inspect Agent Plugins')
    .version('0.0.1');

  // Global flags
  program.option('--dry-run', 'Show what would be done without making changes');
  program.option('--force', 'Overwrite existing files without prompting');
  program.option('--non-interactive', 'Disable interactive prompts');

  // Register commands
  program.addCommand(initCommand);
  program.addCommand(createCommand);
  program.addCommand(migrateCommand);
  program.addCommand(inspectCommand);
  program.addCommand(packageCommand);

  program.parse();
}
