import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import YAML from "yaml";
import type {
  PortablePlugin,
  PortableSkill,
  PortableMcpServer,
  PortableExtension,
  PluginMetadata,
  MigrationWarning,
} from "./types";
import { normalizeMcpCwd } from "./normalize-cwd";

// Schema for the declarative config file (plugin.yml / agent-plugin.yml)
const configSkillSchema = z.object({
  name: z
    .string()
    .max(64)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/),
  description: z.string().min(1).max(1024),
  body: z.string().optional(), // inline body text
  "body-file": z.string().optional(), // path to body file (relative to config file)
  license: z.string().optional(),
  compatibility: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  "allowed-tools": z.union([z.string(), z.array(z.string())]).optional(),
});

const configMcpServerSchema = z.object({
  type: z.enum(["stdio", "streamable-http", "sse"]),
  command: z.string().optional(), // for stdio
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  cwd: z.string().optional(),
  url: z.string().optional(), // for streamable-http / sse
  headers: z.record(z.string(), z.string()).optional(),
});

export const pluginConfigSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(/^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/),
  version: z.string().optional(),
  description: z.string().optional(),
  author: z
    .object({
      name: z.string().optional(),
      email: z.string().optional(),
      url: z.string().optional(),
    })
    .optional(),
  homepage: z.string().optional(),
  repository: z.string().optional(),
  license: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  extensions: z.record(z.string(), z.unknown()).optional(),
  instructions: z.string().optional(),
  "instructions-file": z.string().optional(),
  skills: z.array(configSkillSchema).optional(),
  mcp: z.record(z.string(), configMcpServerSchema).optional(),
  readme: z.boolean().optional(), // generate README scaffold
  "license-file": z.string().optional(), // generate LICENSE (MIT, Apache-2.0, etc.)
});

export type PluginConfig = z.infer<typeof pluginConfigSchema>;

export function parseConfigFile(filePath: string): PluginConfig {
  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch (err: any) {
    if (err.code === "ENOENT" || err.code === "EISDIR") {
      throw new Error(`Config file not found: ${filePath}`, { cause: err });
    }
    throw new Error(`Could not read config file ${filePath}: ${err.message}`, {
      cause: err,
    });
  }

  const parsed = YAML.parse(content);
  const result = pluginConfigSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid config file ${filePath}: ${result.error.message}`);
  }
  return result.data;
}

export function configToPortablePlugin(
  config: PluginConfig,
  configDir: string,
): PortablePlugin {
  const metadata: PluginMetadata = {
    name: config.name,
    version: config.version,
    description: config.description,
    author: config.author,
    homepage: config.homepage,
    repository: config.repository,
    license: config.license,
    keywords: config.keywords,
  };

  // Parse skills
  const skills: PortableSkill[] = (config.skills || []).map((s) => {
    let body = s.body || "";
    if (s["body-file"]) {
      const bodyPath = path.resolve(configDir, s["body-file"]);
      body = fs.readFileSync(bodyPath, "utf-8");
    }
    return {
      name: s.name,
      description: s.description,
      body,
      license: s.license,
      compatibility: s.compatibility,
      metadata: s.metadata,
      allowedTools:
        typeof s["allowed-tools"] === "string"
          ? s["allowed-tools"].split(/\s+/)
          : s["allowed-tools"],
    };
  });

  // Parse MCP servers (named!)
  const mcpServers: PortableMcpServer[] = [];
  const warnings: MigrationWarning[] = [];
  const mcpEntries = Object.entries(config.mcp || {});
  for (const [name, server] of mcpEntries) {
    if (server.type === "stdio") {
      if (!server.command)
        throw new Error(`MCP server "${name}" is stdio but missing command`);
      // mcp.json rejects absolute cwd paths; normalize to `./`-relative when
      // inside the config directory, otherwise keep and warn.
      const { cwd, warning } = normalizeMcpCwd(
        configDir,
        name,
        server.cwd,
        "config directory",
      );
      if (warning) {
        warnings.push(warning);
      }
      mcpServers.push({
        type: "stdio",
        command: server.command,
        args: server.args,
        env: server.env,
        cwd,
        // Store the name for the generator
        _name: name,
      } as any);
    } else {
      if (!server.url)
        throw new Error(
          `MCP server "${name}" is ${server.type} but missing url`,
        );
      mcpServers.push({
        type: server.type,
        url: server.url,
        headers: server.headers,
        _name: name,
      } as any);
    }
  }

  // Parse extensions
  const extensions: PortableExtension[] = Object.entries(
    config.extensions || {},
  ).map(([namespace, data]) => ({ namespace, data }));

  // Parse instructions
  let instructions = config.instructions;
  if (config["instructions-file"]) {
    const instrPath = path.resolve(configDir, config["instructions-file"]);
    instructions = fs.readFileSync(instrPath, "utf-8");
  }

  return {
    metadata,
    instructions,
    skills,
    mcpServers,
    extensions,
    sourceArtifacts: [],
    migrationWarnings: warnings,
    // Extra fields for generator
    _generateReadme: config.readme,
    _licenseType: config["license-file"],
  } as any;
}
