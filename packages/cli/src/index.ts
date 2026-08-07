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
    .description('Create, migrate, package, and inspect Agent Plugins');

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

  // Handle the top-level version flag manually. commander's .version() registers
  // a program-level `--version` option that would otherwise intercept the
  // `create --version <version>` flag before it reaches the subcommand.
  const args = process.argv.slice(2);
  if (args.length === 1 && (args[0] === '--version' || args[0] === '-V')) {
    console.log('0.0.3');
    process.exit(0);
  }

  program.parse();
}
