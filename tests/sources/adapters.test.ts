import { describe, test, expect } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  detectSourceFormat,
  migrateSource,
  migrateVscodeProject,
  migrateOpenCodeProject,
  migrateClaudeProject,
  migrateCursorProject,
  migrateCodexProject,
} from "@agent-plugins-builder/sources";
import type {
  PortablePlugin,
  PortableMcpServer,
  MigrationWarning,
} from "@agent-plugins-builder/core";

describe("detectSourceFormat", () => {
  test("detects Claude project", () => {
    const testDir = "/tmp/test-claude-" + Date.now();
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(path.join(testDir, "CLAUDE.md"), "# Instructions");

    const result = detectSourceFormat(testDir);
    expect(result.detected).toBe(true);
    expect(result.format).toBe("claude");

    fs.rmSync(testDir, { recursive: true });
  });

  test("detects Cursor project", () => {
    const testDir = "/tmp/test-cursor-" + Date.now();
    fs.mkdirSync(path.join(testDir, ".cursor"), { recursive: true });

    const result = detectSourceFormat(testDir);
    expect(result.detected).toBe(true);
    expect(result.format).toBe("cursor");

    fs.rmSync(testDir, { recursive: true });
  });

  test("detects Codex project", () => {
    const testDir = "/tmp/test-codex-" + Date.now();
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(path.join(testDir, "config.toml"), "[model]");

    const result = detectSourceFormat(testDir);
    expect(result.detected).toBe(true);
    expect(result.format).toBe("codex");

    fs.rmSync(testDir, { recursive: true });
  });
});

describe("migrateSource", () => {
  test("migrates Claude project", async () => {
    const testDir = "/tmp/test-migrate-claude-" + Date.now();
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(path.join(testDir, "CLAUDE.md"), "# Instructions");

    const plugin = await migrateSource(testDir, "claude");
    expect(plugin.metadata.name).toBe("migrated-plugin");
    expect(plugin.instructions).toContain("Instructions");

    fs.rmSync(testDir, { recursive: true });
  });
});

function stdioCwd(server: PortableMcpServer): string | undefined {
  return server.type === "stdio" ? server.cwd : undefined;
}

function findServer(
  servers: PortableMcpServer[],
  name: string,
): PortableMcpServer | undefined {
  return servers.find((s) => s._name === name);
}

interface McpAdapterCase {
  name: string;
  writeFixture: (testDir: string, servers: Record<string, unknown>) => void;
  migrate: (
    testDir: string,
  ) => Promise<{ plugin: PortablePlugin; warnings: MigrationWarning[] }>;
}

const mcpAdapterCases: McpAdapterCase[] = [
  {
    name: "Claude",
    writeFixture: (testDir, servers) => {
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(
        path.join(testDir, ".mcp.json"),
        JSON.stringify({ mcpServers: servers }),
      );
    },
    migrate: migrateClaudeProject,
  },
  {
    name: "Cursor",
    writeFixture: (testDir, servers) => {
      fs.mkdirSync(path.join(testDir, ".cursor"), { recursive: true });
      fs.writeFileSync(
        path.join(testDir, ".cursor", "mcp.json"),
        JSON.stringify({ mcpServers: servers }),
      );
    },
    migrate: migrateCursorProject,
  },
];

for (const adapter of mcpAdapterCases) {
  describe(`${adapter.name} MCP migration`, () => {
    async function migrateWithServers(
      servers: Record<string, unknown>,
    ): Promise<{ plugin: PortablePlugin; warnings: MigrationWarning[] }> {
      const testDir = `/tmp/test-${adapter.name.toLowerCase()}-mcp-${Date.now()}`;
      adapter.writeFixture(testDir, servers);
      try {
        return await adapter.migrate(testDir);
      } finally {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    }

    test("maps type-less stdio correctly", async () => {
      const { plugin, warnings } = await migrateWithServers({
        "my-server": { command: "node", args: ["server.js"] },
      });
      const server = findServer(plugin.mcpServers, "my-server");
      expect(server?.type).toBe("stdio");
      if (server?.type === "stdio") {
        expect(server.command).toBe("node");
        expect(server.args).toEqual(["server.js"]);
      }
      expect(warnings).toHaveLength(0);
    });

    test("maps explicit stdio type", async () => {
      const { plugin, warnings } = await migrateWithServers({
        "my-server": { type: "stdio", command: "node", args: ["serve"] },
      });
      const server = findServer(plugin.mcpServers, "my-server");
      expect(server?.type).toBe("stdio");
      if (server?.type === "stdio") {
        expect(server.command).toBe("node");
        expect(server.args).toEqual(["serve"]);
      }
      expect(warnings).toHaveLength(0);
    });

    test("maps local type to stdio", async () => {
      const { plugin, warnings } = await migrateWithServers({
        "my-server": { type: "local", command: "node", args: ["a", "b"] },
      });
      const server = findServer(plugin.mcpServers, "my-server");
      expect(server?.type).toBe("stdio");
      if (server?.type === "stdio") {
        expect(server.command).toBe("node");
        expect(server.args).toEqual(["a", "b"]);
      }
      expect(warnings).toHaveLength(0);
    });

    test("maps http type to streamable-http", async () => {
      const { plugin, warnings } = await migrateWithServers({
        "my-server": { type: "http", url: "https://example.com/mcp" },
      });
      const server = findServer(plugin.mcpServers, "my-server");
      expect(server?.type).toBe("streamable-http");
      if (server?.type === "streamable-http") {
        expect(server.url).toBe("https://example.com/mcp");
      }
      expect(warnings).toHaveLength(0);
    });

    test("maps streamable-http type", async () => {
      const { plugin, warnings } = await migrateWithServers({
        "my-server": {
          type: "streamable-http",
          url: "https://example.com/mcp",
        },
      });
      const server = findServer(plugin.mcpServers, "my-server");
      expect(server?.type).toBe("streamable-http");
      if (server?.type === "streamable-http") {
        expect(server.url).toBe("https://example.com/mcp");
      }
      expect(warnings).toHaveLength(0);
    });

    test("maps remote type to streamable-http", async () => {
      const { plugin, warnings } = await migrateWithServers({
        "my-server": { type: "remote", url: "https://example.com/mcp" },
      });
      const server = findServer(plugin.mcpServers, "my-server");
      expect(server?.type).toBe("streamable-http");
      if (server?.type === "streamable-http") {
        expect(server.url).toBe("https://example.com/mcp");
      }
      expect(warnings).toHaveLength(0);
    });

    test("maps sse type", async () => {
      const { plugin, warnings } = await migrateWithServers({
        "my-server": { type: "sse", url: "https://example.com/sse" },
      });
      const server = findServer(plugin.mcpServers, "my-server");
      expect(server?.type).toBe("sse");
      if (server?.type === "sse") {
        expect(server.url).toBe("https://example.com/sse");
      }
      expect(warnings).toHaveLength(0);
    });

    test("warns on unknown type and skips server", async () => {
      const { plugin, warnings } = await migrateWithServers({
        "my-server": { type: "unknown" },
      });
      expect(plugin.mcpServers).toHaveLength(0);
      expect(warnings).toHaveLength(1);
      expect(warnings[0].severity).toBe("warning");
      expect(warnings[0].component).toBe("mcp");
      expect(warnings[0].message).toContain("unsupported type: unknown");
    });

    test("warns when stdio server is missing command", async () => {
      const { plugin, warnings } = await migrateWithServers({
        "my-server": { type: "stdio" },
      });
      expect(plugin.mcpServers).toHaveLength(0);
      expect(warnings).toHaveLength(1);
      expect(warnings[0].severity).toBe("warning");
      expect(warnings[0].component).toBe("mcp");
      expect(warnings[0].message).toContain("missing command");
    });

    test("warns when http server is missing url", async () => {
      const { plugin, warnings } = await migrateWithServers({
        "my-server": { type: "http" },
      });
      expect(plugin.mcpServers).toHaveLength(0);
      expect(warnings).toHaveLength(1);
      expect(warnings[0].severity).toBe("warning");
      expect(warnings[0].component).toBe("mcp");
      expect(warnings[0].message).toContain("missing url");
    });

    test("warns when sse server is missing url", async () => {
      const { plugin, warnings } = await migrateWithServers({
        "my-server": { type: "sse" },
      });
      expect(plugin.mcpServers).toHaveLength(0);
      expect(warnings).toHaveLength(1);
      expect(warnings[0].severity).toBe("warning");
      expect(warnings[0].component).toBe("mcp");
      expect(warnings[0].message).toContain("missing url");
    });
  });
}

describe("Codex MCP migration", () => {
  async function migrateWithConfig(
    configToml: string,
  ): Promise<{ plugin: PortablePlugin; warnings: MigrationWarning[] }> {
    const testDir = `/tmp/test-codex-mcp-${Date.now()}`;
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(path.join(testDir, "config.toml"), configToml);
    try {
      return await migrateCodexProject(testDir);
    } finally {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  }

  test("preserves args that contain brackets", async () => {
    const { plugin, warnings } = await migrateWithConfig(`[mcp_servers.filesystem]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-filesystem", "."]
`);
    const server = findServer(plugin.mcpServers, "filesystem");
    expect(server?.type).toBe("stdio");
    if (server?.type === "stdio") {
      expect(server.command).toBe("npx");
      expect(server.args).toEqual([
        "-y",
        "@modelcontextprotocol/server-filesystem",
        ".",
      ]);
    }
    expect(warnings).toHaveLength(0);
  });

  test("preserves args with brackets inside a quoted string", async () => {
    const { plugin, warnings } = await migrateWithConfig(`[mcp_servers.format]
command = "codex"
args = ["--format=[json]", "--flag"]
`);
    const server = findServer(plugin.mcpServers, "format");
    if (server?.type === "stdio") {
      expect(server.args).toEqual(["--format=[json]", "--flag"]);
    }
    expect(warnings).toHaveLength(0);
  });

  test("preserves args with commas inside quoted strings", async () => {
    const { plugin, warnings } = await migrateWithConfig(`[mcp_servers.echo]
command = "node"
args = ["echo", "hello, world", "--flag"]
`);
    const server = findServer(plugin.mcpServers, "echo");
    if (server?.type === "stdio") {
      expect(server.args).toEqual(["echo", "hello, world", "--flag"]);
    }
    expect(warnings).toHaveLength(0);
  });

  test("parses multiple servers separated by non-mcp sections", async () => {
    const { plugin, warnings } = await migrateWithConfig(`[mcp_servers.first]
command = "node"
args = ["a.js", "--x"]

[model]
provider = "openai"

[mcp_servers.second]
command = "npx"
args = ["b.js", "--y"]
`);
    expect(plugin.mcpServers).toHaveLength(2);
    const first = findServer(plugin.mcpServers, "first");
    expect(first?.type).toBe("stdio");
    if (first?.type === "stdio") {
      expect(first.args).toEqual(["a.js", "--x"]);
    }
    const second = findServer(plugin.mcpServers, "second");
    expect(second?.type).toBe("stdio");
    if (second?.type === "stdio") {
      expect(second.args).toEqual(["b.js", "--y"]);
    }
    expect(warnings).toHaveLength(0);
  });

  test("warns when args parsing fails", async () => {
    const { plugin, warnings } = await migrateWithConfig(`[mcp_servers.broken]
command = "node"
args = [unclosed
`);
    const server = findServer(plugin.mcpServers, "broken");
    expect(server?.type).toBe("stdio");
    expect(warnings).toHaveLength(1);
    expect(warnings[0].severity).toBe("warning");
    expect(warnings[0].component).toBe("mcp");
    expect(warnings[0].message).toContain("args");
    expect(warnings[0].message).toContain("broken");
  });
});

describe("MCP cwd normalization", () => {
  test("vscode: absolute cwd under project root becomes ./relative", async () => {
    const testDir = "/tmp/test-vscode-cwd-under-" + Date.now();
    const cwdPath = path.join(testDir, "servers");
    fs.mkdirSync(cwdPath, { recursive: true });
    fs.mkdirSync(path.join(testDir, ".vscode"), { recursive: true });
    fs.writeFileSync(
      path.join(testDir, ".vscode", "mcp.json"),
      JSON.stringify({
        servers: {
          "my-server": { type: "stdio", command: "node", cwd: cwdPath },
        },
      }),
    );

    const result = await migrateVscodeProject(testDir);
    expect(stdioCwd(result.plugin.mcpServers[0])).toBe("./servers");
    expect(result.warnings).toHaveLength(0);

    fs.rmSync(testDir, { recursive: true });
  });

  test("vscode: absolute cwd equal to project root becomes ./", async () => {
    const testDir = "/tmp/test-vscode-cwd-root-" + Date.now();
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(path.join(testDir, ".vscode"), { recursive: true });
    fs.writeFileSync(
      path.join(testDir, ".vscode", "mcp.json"),
      JSON.stringify({
        servers: {
          "my-server": { type: "stdio", command: "node", cwd: testDir },
        },
      }),
    );

    const result = await migrateVscodeProject(testDir);
    expect(stdioCwd(result.plugin.mcpServers[0])).toBe("./");
    expect(result.warnings).toHaveLength(0);

    fs.rmSync(testDir, { recursive: true });
  });

  test("vscode: absolute cwd outside project root warns and preserves value", async () => {
    const testDir = "/tmp/test-vscode-cwd-outside-" + Date.now();
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(path.join(testDir, ".vscode"), { recursive: true });
    const outsideCwd = "/tmp/outside-project-root-" + Date.now();
    fs.writeFileSync(
      path.join(testDir, ".vscode", "mcp.json"),
      JSON.stringify({
        servers: {
          "my-server": { type: "stdio", command: "node", cwd: outsideCwd },
        },
      }),
    );

    const result = await migrateVscodeProject(testDir);
    expect(stdioCwd(result.plugin.mcpServers[0])).toBe(outsideCwd);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].severity).toBe("warning");
    expect(result.warnings[0].component).toBe("mcp");
    expect(result.warnings[0].message).toContain(outsideCwd);

    fs.rmSync(testDir, { recursive: true });
    fs.rmSync(outsideCwd, { recursive: true, force: true });
  });

  test("vscode: relative and ${PLUGIN_*} cwd values are preserved as-is", async () => {
    const testDir = "/tmp/test-vscode-cwd-valid-" + Date.now();
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(path.join(testDir, ".vscode"), { recursive: true });
    fs.writeFileSync(
      path.join(testDir, ".vscode", "mcp.json"),
      JSON.stringify({
        servers: {
          rel: { type: "stdio", command: "node", cwd: "./servers" },
          root: {
            type: "stdio",
            command: "node",
            cwd: "${PLUGIN_ROOT}/servers",
          },
          data: {
            type: "stdio",
            command: "node",
            cwd: "${PLUGIN_DATA}/servers",
          },
          none: { type: "stdio", command: "node" },
        },
      }),
    );

    const result = await migrateVscodeProject(testDir);
    expect(stdioCwd(result.plugin.mcpServers[0])).toBe("./servers");
    expect(stdioCwd(result.plugin.mcpServers[1])).toBe(
      "${PLUGIN_ROOT}/servers",
    );
    expect(stdioCwd(result.plugin.mcpServers[2])).toBe(
      "${PLUGIN_DATA}/servers",
    );
    expect(stdioCwd(result.plugin.mcpServers[3])).toBeUndefined();
    expect(result.warnings).toHaveLength(0);

    fs.rmSync(testDir, { recursive: true });
  });

  test("opencode: absolute cwd under project root becomes ./relative", async () => {
    const testDir = "/tmp/test-opencode-cwd-under-" + Date.now();
    const cwdPath = path.join(testDir, "tools");
    fs.mkdirSync(cwdPath, { recursive: true });
    fs.writeFileSync(
      path.join(testDir, "opencode.json"),
      JSON.stringify({
        mcp: {
          "my-server": {
            type: "local",
            command: ["node", "server.js"],
            cwd: cwdPath,
          },
        },
      }),
    );

    const result = await migrateOpenCodeProject(testDir);
    expect(stdioCwd(result.plugin.mcpServers[0])).toBe("./tools");
    expect(result.warnings).toHaveLength(0);

    fs.rmSync(testDir, { recursive: true });
  });

  test("opencode: absolute cwd outside project root warns and preserves value", async () => {
    const testDir = "/tmp/test-opencode-cwd-outside-" + Date.now();
    fs.mkdirSync(testDir, { recursive: true });
    const outsideCwd = "/tmp/outside-opencode-root-" + Date.now();
    fs.writeFileSync(
      path.join(testDir, "opencode.json"),
      JSON.stringify({
        mcp: {
          "my-server": {
            type: "local",
            command: ["node", "server.js"],
            cwd: outsideCwd,
          },
        },
      }),
    );

    const result = await migrateOpenCodeProject(testDir);
    expect(stdioCwd(result.plugin.mcpServers[0])).toBe(outsideCwd);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].message).toContain(outsideCwd);

    fs.rmSync(testDir, { recursive: true });
    fs.rmSync(outsideCwd, { recursive: true, force: true });
  });

  test("opencode: relative and ${PLUGIN_*} cwd values are preserved as-is", async () => {
    const testDir = "/tmp/test-opencode-cwd-valid-" + Date.now();
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(
      path.join(testDir, "opencode.json"),
      JSON.stringify({
        mcp: {
          rel: {
            type: "local",
            command: ["node", "server.js"],
            cwd: "./tools",
          },
          root: {
            type: "local",
            command: ["node", "server.js"],
            cwd: "${PLUGIN_ROOT}/tools",
          },
          data: {
            type: "local",
            command: ["node", "server.js"],
            cwd: "${PLUGIN_DATA}/tools",
          },
          none: { type: "local", command: ["node", "server.js"] },
        },
      }),
    );

    const result = await migrateOpenCodeProject(testDir);
    expect(stdioCwd(result.plugin.mcpServers[0])).toBe("./tools");
    expect(stdioCwd(result.plugin.mcpServers[1])).toBe("${PLUGIN_ROOT}/tools");
    expect(stdioCwd(result.plugin.mcpServers[2])).toBe("${PLUGIN_DATA}/tools");
    expect(stdioCwd(result.plugin.mcpServers[3])).toBeUndefined();
    expect(result.warnings).toHaveLength(0);

    fs.rmSync(testDir, { recursive: true });
  });
});

interface SkillAdapterCase {
  name: string;
  writeFixture: (testDir: string, skillContent: string) => void;
  migrate: (
    testDir: string,
  ) => Promise<{ plugin: PortablePlugin; warnings: MigrationWarning[] }>;
}

const skillAdapterCases: SkillAdapterCase[] = [
  {
    name: "Claude",
    writeFixture: (testDir, skillContent) => {
      fs.mkdirSync(path.join(testDir, ".claude", "skills", "test-skill"), {
        recursive: true,
      });
      fs.writeFileSync(
        path.join(testDir, ".claude", "skills", "test-skill", "SKILL.md"),
        skillContent,
      );
    },
    migrate: migrateClaudeProject,
  },
  {
    name: "Cursor",
    writeFixture: (testDir, skillContent) => {
      fs.mkdirSync(path.join(testDir, ".cursor", "skills", "test-skill"), {
        recursive: true,
      });
      fs.writeFileSync(
        path.join(testDir, ".cursor", "skills", "test-skill", "SKILL.md"),
        skillContent,
      );
    },
    migrate: migrateCursorProject,
  },
  {
    name: "OpenCode",
    writeFixture: (testDir, skillContent) => {
      fs.mkdirSync(path.join(testDir, ".opencode", "skills", "test-skill"), {
        recursive: true,
      });
      fs.writeFileSync(
        path.join(testDir, ".opencode", "skills", "test-skill", "SKILL.md"),
        skillContent,
      );
    },
    migrate: migrateOpenCodeProject,
  },
  {
    name: "VS Code",
    writeFixture: (testDir, skillContent) => {
      fs.mkdirSync(path.join(testDir, ".github", "skills", "test-skill"), {
        recursive: true,
      });
      fs.writeFileSync(
        path.join(testDir, ".github", "skills", "test-skill", "SKILL.md"),
        skillContent,
      );
    },
    migrate: migrateVscodeProject,
  },
];

for (const adapter of skillAdapterCases) {
  describe(`${adapter.name} skill frontmatter parsing`, () => {
    async function migrateWithSkill(
      skillContent: string,
    ): Promise<{ plugin: PortablePlugin; warnings: MigrationWarning[] }> {
      const testDir = `/tmp/test-${adapter.name.toLowerCase()}-skill-${Date.now()}`;
      adapter.writeFixture(testDir, skillContent);
      try {
        return await adapter.migrate(testDir);
      } finally {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    }

    test("preserves body content after a --- horizontal rule", async () => {
      const { plugin } = await migrateWithSkill(
        [
          "---",
          "name: test",
          "description: A test skill",
          "---",
          "Intro paragraph",
          "",
          "---",
          "",
          "Content after HR",
        ].join("\n"),
      );
      const skill = plugin.skills[0];
      expect(skill.name).toBe("test");
      expect(skill.description).toBe("A test skill");
      expect(skill.body).toContain("Intro paragraph");
      expect(skill.body).toContain("Content after HR");
      // The horizontal rule itself must remain part of the body.
      expect(skill.body).toContain("---");
    });

    test("treats --- as body content when the file does not start with frontmatter", async () => {
      const { plugin } = await migrateWithSkill(
        [
          "Just a body line",
          "",
          "---",
          "",
          "More content",
        ].join("\n"),
      );
      const skill = plugin.skills[0];
      expect(skill.name).toBe("test-skill");
      expect(skill.body).toContain("Just a body line");
      expect(skill.body).toContain("More content");
      expect(skill.body).toContain("---");
    });

    test("parses skills without frontmatter as pure body", async () => {
      const { plugin } = await migrateWithSkill("Body only, no frontmatter");
      const skill = plugin.skills[0];
      expect(skill.name).toBe("test-skill");
      expect(skill.description).toBe("Migrated skill");
      expect(skill.body).toBe("Body only, no frontmatter");
    });

    test("keeps multiple --- horizontal rules in the body", async () => {
      const { plugin } = await migrateWithSkill(
        [
          "---",
          "name: hr-test",
          "---",
          "Section one",
          "",
          "---",
          "",
          "Section two",
          "",
          "---",
          "",
          "Section three",
        ].join("\n"),
      );
      const skill = plugin.skills[0];
      expect(skill.name).toBe("hr-test");
      expect(skill.body).toContain("Section one");
      expect(skill.body).toContain("Section two");
      expect(skill.body).toContain("Section three");
      // Both horizontal rules preserved in order.
      expect(skill.body.indexOf("Section one")).toBeLessThan(
        skill.body.indexOf("Section two"),
      );
      expect(skill.body.indexOf("Section two")).toBeLessThan(
        skill.body.indexOf("Section three"),
      );
    });
  });
}
