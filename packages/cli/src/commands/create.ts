import { Command } from "commander";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  writePluginJson,
  writeSkills,
  writeMcpJson,
  generatePlugin,
} from "@agent-plugins-builder/generator";
import {
  parseConfigFile,
  configToPortablePlugin,
} from "@agent-plugins-builder/core";
import type {
  PluginMetadata,
  PortableSkill,
  PortableMcpServer,
} from "@agent-plugins-builder/core";

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

// commander emits variadic option values one at a time, so collect them individually
function collectArgs(value: string, previous: string[]): string[] {
  return [...previous, value];
}

function collectEnv(
  value: string,
  previous: Record<string, string>,
): Record<string, string> {
  const separatorIndex = value.indexOf("=");
  if (separatorIndex === -1) {
    throw new Error(`Invalid --mcp-env value "${value}". Expected KEY=VALUE.`);
  }
  const key = value.slice(0, separatorIndex).trim();
  const envValue = value.slice(separatorIndex + 1);
  previous[key] = envValue;
  return previous;
}

function defaultSkillBody(name: string): string {
  const title = name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return `# ${title}\n`;
}

function buildMcpServer(options: any): PortableMcpServer {
  const type = options.mcpType;
  if (type === "stdio") {
    if (!options.mcpCommand) {
      throw new Error("--mcp-command is required for stdio MCP server");
    }
    return {
      type: "stdio",
      command: options.mcpCommand,
      args: options.mcpArgs.length > 0 ? options.mcpArgs : undefined,
      env: Object.keys(options.mcpEnv).length > 0 ? options.mcpEnv : undefined,
      cwd: options.mcpCwd,
      _name: options.mcpName,
    };
  }
  if (type === "streamable-http" || type === "sse") {
    if (!options.mcpUrl) {
      throw new Error(`--mcp-url is required for ${type} MCP server`);
    }
    return {
      type,
      url: options.mcpUrl,
      _name: options.mcpName,
    };
  }
  throw new Error(`Invalid MCP type: ${type}`);
}

export const createCommand = new Command("create")
  .description("Create an Agent Plugin from flags or a declarative config file")
  .option("--name <name>", "Plugin name")
  .option("--config <file>", "Declarative plugin config file (plugin.yml)")
  .option("--description <description>", "Plugin description")
  .option("--version <version>", "Plugin version")
  .option("--author-name <name>", "Author name")
  .option("--author-email <email>", "Author email")
  .option("--author-url <url>", "Author URL")
  .option("--homepage <url>", "Plugin homepage")
  .option("--repository <url>", "Plugin repository")
  .option("--license <spdx>", "Plugin license (SPDX identifier)")
  .option("--keywords <k1,k2,...>", "Comma-separated plugin keywords")
  .option("--skill <name>", "Add a skill (repeatable)", collect, [])
  .option("--skill-name <name>", "Skill name (legacy, for --skills-only)")
  .option(
    "--skill-description <description>",
    "Description for the last --skill",
  )
  .option("--skill-body-file <path>", "Body file for the last --skill")
  .option("--skills-only", "Create a plugin with skills (no MCP)")
  .option("--mcp-name <name>", "Name for the MCP server")
  .option("--mcp-type <type>", "MCP server type: stdio, streamable-http, sse")
  .option("--mcp-command <command>", "MCP command (for stdio)")
  .option(
    "--mcp-args <args...>",
    "MCP server args (repeatable)",
    collectArgs,
    [],
  )
  .option(
    "--mcp-env <KEY=VALUE>",
    "MCP server env vars (repeatable)",
    collectEnv,
    {},
  )
  .option("--mcp-cwd <path>", "MCP server working directory")
  .option("--mcp-url <url>", "MCP URL (for streamable-http or sse)")
  .option("--mcp-only", "Create a plugin with MCP servers (no skills)")
  .option("--output <directory>", "Output directory", ".")
  .action(async (options: any, command: Command) => {
    const opts = command.optsWithGlobals();
    const dryRun = opts.dryRun;
    const outputDir = path.resolve(options.output);

    // Declarative config path — config file handles everything
    if (options.config) {
      const configPath = path.resolve(options.config);
      const configDir = path.dirname(configPath);
      const config = parseConfigFile(configPath);
      const plugin = configToPortablePlugin(config, configDir);

      const result = generatePlugin({ plugin, outputDir, dryRun });
      if (dryRun) {
        console.log("\nDry run - would create:");
        result.filesCreated.forEach((file) => console.log(`  ${file}`));
      } else {
        console.log(`✓ Created Agent Plugin in ${outputDir}`);
        console.log(`  Created ${result.filesCreated.length} files`);
      }

      // Surface migration warnings (e.g. cwd outside the config directory)
      if (result.warnings.length > 0) {
        console.log("\nWarnings:");
        result.warnings.forEach((warning) => console.log(`  ⚠ ${warning}`));
      }
      return;
    }

    if (!options.name) {
      throw new Error(
        "--name is required (or use --config with a plugin.yml file)",
      );
    }

    const metadata: PluginMetadata = {
      name: options.name,
      description: options.description,
      version: options.version,
      homepage: options.homepage,
      repository: options.repository,
      license: options.license,
      keywords: options.keywords
        ? options.keywords
            .split(",")
            .map((k: string) => k.trim())
            .filter(Boolean)
        : undefined,
    };

    if (options.authorName || options.authorEmail || options.authorUrl) {
      metadata.author = {
        name: options.authorName,
        email: options.authorEmail,
        url: options.authorUrl,
      };
    }

    // Build skills from --skill flags (repeatable)
    const skills: PortableSkill[] = [];
    if (options.skill.length > 0) {
      options.skill.forEach((name: string, index: number) => {
        const isLast = index === options.skill.length - 1;
        const description =
          isLast && options.skillDescription
            ? options.skillDescription
            : `A ${name} skill`;
        const body =
          isLast && options.skillBodyFile
            ? fs.readFileSync(path.resolve(options.skillBodyFile), "utf-8")
            : defaultSkillBody(name);
        skills.push({ name, description, body });
      });
    } else if (options.skillsOnly) {
      // Legacy --skills-only flag
      const name = options.skillName || "example-skill";
      skills.push({
        name,
        description: options.skillDescription || `An example skill`,
        body: defaultSkillBody(name),
      });
    }

    // Build MCP server from --mcp-* flags
    const mcpServers: PortableMcpServer[] = [];
    if (options.mcpType) {
      mcpServers.push(buildMcpServer(options));
    } else if (options.mcpOnly) {
      // Legacy --mcp-only flag
      if (!options.mcpType) {
        throw new Error("--mcp-type is required for --mcp-only");
      }
      mcpServers.push(buildMcpServer(options));
    }

    // Default: create a basic plugin with one example skill
    if (skills.length === 0 && mcpServers.length === 0) {
      skills.push({
        name: "example-skill",
        description: "An example skill",
        body: defaultSkillBody("example-skill"),
      });
    }

    if (!dryRun) {
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
    } else {
      console.log("\nDry run - would create:");
      console.log(`  ${path.join(outputDir, "plugin.json")}`);
      if (skills.length > 0) {
        skills.forEach((s) =>
          console.log(
            `  ${path.join(outputDir, "skills", s.name, "SKILL.md")}`,
          ),
        );
      }
      if (mcpServers.length > 0) {
        console.log(`  ${path.join(outputDir, "mcp.json")}`);
      }
    }
  });
