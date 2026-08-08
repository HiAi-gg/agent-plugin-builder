import { describe, test, expect } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  parseConfigFile,
  configToPortablePlugin,
  type PortablePlugin,
} from "@agent-plugins-builder/core";

// Narrow the PortableMcpServer union so `.cwd` (stdio-only) is accessible
function stdioCwd(plugin: PortablePlugin): string | undefined {
  const server = plugin.mcpServers[0];
  if (server.type !== "stdio") {
    throw new Error("expected first MCP server to be stdio");
  }
  return server.cwd;
}

describe("plugin config parsing", () => {
  test("parses a valid config file", () => {
    const configPath = path.join(
      os.tmpdir(),
      "test-config-" + Date.now() + ".yml",
    );
    fs.writeFileSync(
      configPath,
      `name: test-plugin
version: 0.1.0
description: A test plugin
author:
  name: Test Author
  email: test@example.com
license: MIT
keywords:
  - test
  - demo
skills:
  - name: test-skill
    description: A test skill
    body: |
      # Test Skill
      This is the body.
mcp:
  my-server:
    type: stdio
    command: node
    args:
      - server.js
readme: true
license-file: MIT
`,
      "utf-8",
    );

    const config = parseConfigFile(configPath);
    expect(config.name).toBe("test-plugin");
    expect(config.version).toBe("0.1.0");
    expect(config.author?.name).toBe("Test Author");
    expect(config.skills?.length).toBe(1);
    expect(config.skills?.[0].name).toBe("test-skill");
    expect(config.mcp?.["my-server"].type).toBe("stdio");
    expect(config.readme).toBe(true);

    const plugin = configToPortablePlugin(config, path.dirname(configPath));
    expect(plugin.metadata.name).toBe("test-plugin");
    expect(plugin.skills[0].body).toContain("# Test Skill");
    expect(plugin.mcpServers[0]._name).toBe("my-server");
    expect(plugin._generateReadme).toBe(true);
    expect(plugin._licenseType).toBe("MIT");

    fs.rmSync(configPath);
  });

  test("rejects invalid config files", () => {
    const configPath = path.join(
      os.tmpdir(),
      "test-config-invalid-" + Date.now() + ".yml",
    );
    fs.writeFileSync(configPath, 'name: "UPPER_CASE!"\n', "utf-8");

    expect(() => parseConfigFile(configPath)).toThrow(/Invalid config file/);

    fs.rmSync(configPath);
  });

  test("throws clean error when config file does not exist", () => {
    const configPath = path.join(
      os.tmpdir(),
      "test-config-missing-" + Date.now() + ".yml",
    );

    expect(() => parseConfigFile(configPath)).toThrow(
      `Config file not found: ${configPath}`,
    );
  });

  test("throws clean error when config path is a directory", () => {
    const configDir = path.join(os.tmpdir(), "test-config-dir-" + Date.now());
    fs.mkdirSync(configDir);

    expect(() => parseConfigFile(configDir)).toThrow(
      `Config file not found: ${configDir}`,
    );

    fs.rmdirSync(configDir);
  });

  test("throws when stdio MCP server is missing command", () => {
    const config = {
      name: "test-plugin",
      mcp: {
        broken: {
          type: "stdio",
        },
      },
    } as any;

    expect(() => configToPortablePlugin(config, "/tmp")).toThrow(
      'MCP server "broken" is stdio but missing command',
    );
  });

  test("resolves body-file relative to config directory", () => {
    const configDir = path.join(os.tmpdir(), "test-config-body-" + Date.now());
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, "body.md"),
      "# From File\nBody content.\n",
      "utf-8",
    );

    const config = {
      name: "test-plugin",
      skills: [
        {
          name: "file-skill",
          description: "A skill with a body file",
          "body-file": "body.md",
        },
      ],
    } as any;

    const plugin = configToPortablePlugin(config, configDir);
    expect(plugin.skills[0].body).toBe("# From File\nBody content.\n");

    fs.rmSync(configDir, { recursive: true });
  });

  test("converts allowed-tools string to array", () => {
    const config = {
      name: "test-plugin",
      skills: [
        {
          name: "tool-skill",
          description: "A skill with tools",
          body: "body",
          "allowed-tools": "shell bash",
        },
      ],
    } as any;

    const plugin = configToPortablePlugin(config, "/tmp");
    expect(plugin.skills[0].allowedTools).toEqual(["shell", "bash"]);
  });

  test("passes through allowed-tools array", () => {
    const config = {
      name: "test-plugin",
      skills: [
        {
          name: "tool-skill",
          description: "A skill with tools",
          body: "body",
          "allowed-tools": ["shell", "bash"],
        },
      ],
    } as any;

    const plugin = configToPortablePlugin(config, "/tmp");
    expect(plugin.skills[0].allowedTools).toEqual(["shell", "bash"]);
  });

  test("converts extensions to PortableExtension entries", () => {
    const config = {
      name: "test-plugin",
      extensions: {
        "com.example.client": { foo: "bar" },
      },
    } as any;

    const plugin = configToPortablePlugin(config, "/tmp");
    expect(plugin.extensions).toEqual([
      { namespace: "com.example.client", data: { foo: "bar" } },
    ]);
  });

  test("normalizes absolute cwd inside config directory to relative", () => {
    const configDir = path.join(
      os.tmpdir(),
      "test-config-cwd-in-" + Date.now(),
    );
    fs.mkdirSync(configDir, { recursive: true });

    const config = {
      name: "test-plugin",
      mcp: {
        local: {
          type: "stdio",
          command: "node",
          args: ["server.js"],
          cwd: path.join(configDir, "scripts"),
        },
      },
    } as any;

    const plugin = configToPortablePlugin(config, configDir);
    expect(stdioCwd(plugin)).toBe("./scripts");
    expect(plugin.migrationWarnings).toEqual([]);

    fs.rmSync(configDir, { recursive: true });
  });

  test("normalizes absolute cwd equal to config directory", () => {
    const configDir = path.join(
      os.tmpdir(),
      "test-config-cwd-root-" + Date.now(),
    );
    fs.mkdirSync(configDir, { recursive: true });

    const config = {
      name: "test-plugin",
      mcp: {
        local: {
          type: "stdio",
          command: "node",
          cwd: configDir,
        },
      },
    } as any;

    const plugin = configToPortablePlugin(config, configDir);
    expect(stdioCwd(plugin)).toBe("./");

    fs.rmSync(configDir, { recursive: true });
  });

  test("preserves absolute cwd outside config directory and warns", () => {
    const configDir = path.join(
      os.tmpdir(),
      "test-config-cwd-out-" + Date.now(),
    );
    fs.mkdirSync(configDir, { recursive: true });
    const outsideCwd = path.resolve(
      configDir,
      "..",
      "outside",
      "project",
      "bin",
    );

    const config = {
      name: "test-plugin",
      mcp: {
        local: {
          type: "stdio",
          command: "node",
          cwd: outsideCwd,
        },
      },
    } as any;

    const plugin = configToPortablePlugin(config, configDir);
    expect(stdioCwd(plugin)).toBe(outsideCwd);
    expect(plugin.migrationWarnings).toHaveLength(1);
    expect(plugin.migrationWarnings[0]).toMatchObject({
      severity: "warning",
      component: "mcp",
    });
    expect(plugin.migrationWarnings[0].message).toContain(
      `MCP server "local" has cwd outside config directory: ${outsideCwd}`,
    );

    fs.rmSync(configDir, { recursive: true });
  });

  test("passes through relative cwd unchanged", () => {
    const configDir = path.join(
      os.tmpdir(),
      "test-config-cwd-rel-" + Date.now(),
    );
    fs.mkdirSync(configDir, { recursive: true });

    const config = {
      name: "test-plugin",
      mcp: {
        local: {
          type: "stdio",
          command: "node",
          cwd: "./scripts",
        },
      },
    } as any;

    const plugin = configToPortablePlugin(config, configDir);
    expect(stdioCwd(plugin)).toBe("./scripts");
    expect(plugin.migrationWarnings).toEqual([]);

    fs.rmSync(configDir, { recursive: true });
  });
});
