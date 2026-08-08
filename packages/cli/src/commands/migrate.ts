import { Command } from "commander";
import * as path from "node:path";
import {
  detectSourceFormat,
  migrateSource,
  type SourceFormat,
} from "@agent-plugins-builder/sources";
import { generatePlugin } from "@agent-plugins-builder/generator";

export const migrateCommand = new Command("migrate")
  .description("Migrate from existing agent format to Agent Plugins")
  .argument("<source-dir>", "Source directory to migrate")
  .option(
    "--from <format>",
    "Source format (claude, cursor, codex, opencode, vscode)",
  )
  .option("--output <dir>", "Output directory", "./agent-plugins")
  .option("--dry-run", "Preview without writing")
  .option("--force", "Overwrite existing files")
  .action(async (sourceDir: string, options: any, command: Command) => {
    // The parent program also declares --dry-run/--force/--non-interactive as
    // global options. optsWithGlobals() merges the parent options in, so the
    // flags work both before and after the subcommand name.
    const opts = command.optsWithGlobals();
    const dryRun = opts.dryRun;

    const sourcePath = path.resolve(sourceDir);
    const outputDir = path.resolve(options.output);

    console.log(`Migrating from ${sourcePath}...`);

    // Detect source format
    if (options.from) {
      console.log(`Using specified format: ${options.from}`);
    } else {
      const detection = detectSourceFormat(sourcePath);
      if (!detection.detected) {
        console.error("Could not detect source format. Use --from to specify.");
        process.exit(1);
      }
      console.log(
        `Detected format: ${detection.format} (${detection.confidence} confidence)`,
      );
    }

    // Migrate
    try {
      const plugin = await migrateSource(
        sourcePath,
        options.from as SourceFormat,
      );

      // Generate output
      const result = generatePlugin({
        plugin,
        outputDir,
        dryRun,
        force: opts.force,
      });

      if (dryRun) {
        console.log("\nDry run - would create:");
        result.filesCreated.forEach((file) => console.log(`  ${file}`));
      } else {
        console.log(`\n✓ Migrated to Agent Plugin in ${outputDir}`);
        console.log(`  Created ${result.filesCreated.length} files`);
      }

      // Show warnings
      if (result.warnings.length > 0) {
        console.log("\nWarnings:");
        result.warnings.forEach((warning) => console.log(`  ⚠ ${warning}`));
      }

      // Show migration report
      if (plugin.sourceArtifacts.length > 0) {
        console.log("\nMigration report:");
        const portable = plugin.sourceArtifacts.filter(
          (a) => a.classification === "PORTABLE",
        );
        const clientSpecific = plugin.sourceArtifacts.filter(
          (a) => a.classification === "CLIENT_SPECIFIC",
        );
        const unsupported = plugin.sourceArtifacts.filter(
          (a) => a.classification === "UNSUPPORTED",
        );

        if (portable.length > 0) {
          console.log(`  ✓ Portable: ${portable.length} item(s)`);
        }
        if (clientSpecific.length > 0) {
          console.log(
            `  ⚠ Client-specific: ${clientSpecific.length} item(s) (not migrated)`,
          );
        }
        if (unsupported.length > 0) {
          console.log(
            `  ✗ Unsupported: ${unsupported.length} item(s) (not migrated)`,
          );
        }
      }
    } catch (error) {
      console.error(`Migration failed: ${error}`);
      process.exit(1);
    }
  });
