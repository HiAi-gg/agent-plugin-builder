import { describe, test, expect } from 'bun:test';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('CLI commands', () => {
  test('init --yes creates plugin with defaults', () => {
    const outputDir = '/tmp/test-cli-init-' + Date.now();
    execSync(
      `bun packages/cli/bin/agent-plugin init --yes --name test-plugin ${outputDir}`,
      {
        stdio: 'pipe',
      },
    );

    expect(fs.existsSync(path.join(outputDir, 'plugin.json'))).toBe(true);
    // Defaults: one example skill, README + LICENSE
    expect(
      fs.existsSync(
        path.join(outputDir, 'skills', 'example-skill', 'SKILL.md'),
      ),
    ).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'README.md'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'LICENSE'))).toBe(true);

    fs.rmSync(outputDir, { recursive: true });
  });

  test('init --non-interactive is an alias for --yes', () => {
    const outputDir = '/tmp/test-cli-init-ni-' + Date.now();
    execSync(
      `bun packages/cli/bin/agent-plugin init --non-interactive --name ni-plugin ${outputDir}`,
      { stdio: 'pipe' },
    );

    expect(fs.existsSync(path.join(outputDir, 'plugin.json'))).toBe(true);

    fs.rmSync(outputDir, { recursive: true });
  });

  test('init --config generates plugin from declarative config', () => {
    const configDir = '/tmp/test-cli-init-config-' + Date.now();
    fs.mkdirSync(configDir, { recursive: true });
    const configPath = path.join(configDir, 'plugin.yml');
    fs.writeFileSync(
      configPath,
      `name: init-config-plugin
version: 0.1.0
description: A plugin from init --config
author:
  name: Init Author
license: MIT
skills:
  - name: init-skill
    description: A skill from config
    body: |
      # Init Skill
      Body from init config.
mcp:
  init-server:
    type: stdio
    command: node
    args:
      - server.js
readme: true
license-file: MIT
`,
      'utf-8',
    );
    const outputDir = path.join(configDir, 'out');

    execSync(
      `bun packages/cli/bin/agent-plugin init --config ${configPath} ${outputDir}`,
      { stdio: 'pipe' },
    );

    expect(fs.existsSync(path.join(outputDir, 'plugin.json'))).toBe(true);
    expect(
      fs.existsSync(path.join(outputDir, 'skills', 'init-skill', 'SKILL.md')),
    ).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'mcp.json'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'README.md'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'LICENSE'))).toBe(true);

    const mcpJson = JSON.parse(
      fs.readFileSync(path.join(outputDir, 'mcp.json'), 'utf-8'),
    );
    expect(Object.keys(mcpJson.mcpServers)).toEqual(['init-server']);

    fs.rmSync(configDir, { recursive: true });
  });

  test('create --skills-only creates plugin with skill', () => {
    const outputDir = '/tmp/test-cli-create-' + Date.now();
    execSync(
      `bun packages/cli/bin/agent-plugin create --name test-plugin --skills-only --output ${outputDir}`,
      { stdio: 'pipe' },
    );

    expect(fs.existsSync(path.join(outputDir, 'skills'))).toBe(true);

    fs.rmSync(outputDir, { recursive: true });
  });

  test('create --config generates full plugin from declarative config', () => {
    const configDir = '/tmp/test-cli-config-' + Date.now();
    fs.mkdirSync(configDir, { recursive: true });
    const configPath = path.join(configDir, 'plugin.yml');
    fs.writeFileSync(
      configPath,
      `name: test-plugin
version: 0.1.0
description: A test plugin
author:
  name: Test Author
license: MIT
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
      'utf-8',
    );
    const outputDir = path.join(configDir, 'out');

    execSync(
      `bun packages/cli/bin/agent-plugin create --config ${configPath} --output ${outputDir}`,
      { stdio: 'pipe' },
    );

    expect(fs.existsSync(path.join(outputDir, 'plugin.json'))).toBe(true);
    expect(
      fs.existsSync(path.join(outputDir, 'skills', 'test-skill', 'SKILL.md')),
    ).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'mcp.json'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'README.md'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'LICENSE'))).toBe(true);

    // MCP server keeps its name
    const mcpJson = JSON.parse(
      fs.readFileSync(path.join(outputDir, 'mcp.json'), 'utf-8'),
    );
    expect(Object.keys(mcpJson.mcpServers)).toEqual(['my-server']);

    fs.rmSync(configDir, { recursive: true });
  });

  test('create combines skills and MCP from flags', () => {
    const outputDir = '/tmp/test-cli-combined-' + Date.now();
    execSync(
      `bun packages/cli/bin/agent-plugin create --name test-plugin --skill alpha --skill beta ` +
        `--mcp-type stdio --mcp-command node --mcp-name my-server --output ${outputDir}`,
      { stdio: 'pipe' },
    );

    expect(
      fs.existsSync(path.join(outputDir, 'skills', 'alpha', 'SKILL.md')),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(outputDir, 'skills', 'beta', 'SKILL.md')),
    ).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'mcp.json'))).toBe(true);

    const mcpJson = JSON.parse(
      fs.readFileSync(path.join(outputDir, 'mcp.json'), 'utf-8'),
    );
    expect(Object.keys(mcpJson.mcpServers)).toEqual(['my-server']);

    fs.rmSync(outputDir, { recursive: true });
  });

  test('create supports full manifest metadata flags', () => {
    const outputDir = '/tmp/test-cli-metadata-' + Date.now();
    execSync(
      `bun packages/cli/bin/agent-plugin create --name test-plugin --version 1.2.3 ` +
        `--author-name "Jane Doe" --author-email jane@example.com --homepage https://example.com ` +
        `--license MIT --keywords "test,demo" --output ${outputDir}`,
      { stdio: 'pipe' },
    );

    const pluginJson = JSON.parse(
      fs.readFileSync(path.join(outputDir, 'plugin.json'), 'utf-8'),
    );
    expect(pluginJson.version).toBe('1.2.3');
    expect(pluginJson.author).toEqual({
      name: 'Jane Doe',
      email: 'jane@example.com',
    });
    expect(pluginJson.homepage).toBe('https://example.com');
    expect(pluginJson.license).toBe('MIT');
    expect(pluginJson.keywords).toEqual(['test', 'demo']);

    fs.rmSync(outputDir, { recursive: true });
  });

  test('package creates a zip archive by default', () => {
    const pluginDir = '/tmp/test-cli-pkg-src-' + Date.now();
    execSync(
      `bun packages/cli/bin/agent-plugin create --name test-pkg --skills-only --output ${pluginDir}`,
      { stdio: 'pipe' },
    );

    const outDir = '/tmp/test-cli-pkg-out-' + Date.now();
    execSync(
      `bun packages/cli/bin/agent-plugin package ${pluginDir} --output ${outDir}`,
      { stdio: 'pipe' },
    );

    const zipPath = path.join(outDir, 'test-pkg.zip');
    expect(fs.existsSync(zipPath)).toBe(true);
    // ZIP archives start with the "PK\x03\x04" local file header magic.
    expect(fs.readFileSync(zipPath).subarray(0, 4).toString('hex')).toBe('504b0304');

    fs.rmSync(pluginDir, { recursive: true });
    fs.rmSync(outDir, { recursive: true });
  });

  test('package --format tar.gz creates a gzipped tarball', () => {
    const pluginDir = '/tmp/test-cli-pkg-tar-src-' + Date.now();
    execSync(
      `bun packages/cli/bin/agent-plugin create --name test-pkg --skills-only --output ${pluginDir}`,
      { stdio: 'pipe' },
    );

    const outDir = '/tmp/test-cli-pkg-tar-out-' + Date.now();
    execSync(
      `bun packages/cli/bin/agent-plugin package ${pluginDir} --output ${outDir} --format tar.gz`,
      { stdio: 'pipe' },
    );

    const gzPath = path.join(outDir, 'test-pkg.tar.gz');
    expect(fs.existsSync(gzPath)).toBe(true);
    // gzip streams start with the \x1f\x8b magic bytes.
    expect(fs.readFileSync(gzPath).subarray(0, 2).toString('hex')).toBe('1f8b');

    fs.rmSync(pluginDir, { recursive: true });
    fs.rmSync(outDir, { recursive: true });
  });

  test('package --format dir copies the plugin directory', () => {
    const pluginDir = '/tmp/test-cli-pkg-dir-src-' + Date.now();
    execSync(
      `bun packages/cli/bin/agent-plugin create --name test-pkg --skills-only --output ${pluginDir}`,
      { stdio: 'pipe' },
    );

    const outDir = '/tmp/test-cli-pkg-dir-out-' + Date.now();
    execSync(
      `bun packages/cli/bin/agent-plugin package ${pluginDir} --output ${outDir} --format dir`,
      { stdio: 'pipe' },
    );

    expect(fs.existsSync(path.join(outDir, 'plugin.json'))).toBe(true);
    expect(
      fs.existsSync(path.join(outDir, 'skills', 'example-skill', 'SKILL.md')),
    ).toBe(true);

    fs.rmSync(pluginDir, { recursive: true });
    fs.rmSync(outDir, { recursive: true });
  });

  test('package --dry-run validates without creating an archive', () => {
    const pluginDir = '/tmp/test-cli-pkg-dry-src-' + Date.now();
    execSync(
      `bun packages/cli/bin/agent-plugin create --name test-pkg --skills-only --output ${pluginDir}`,
      { stdio: 'pipe' },
    );

    const outDir = '/tmp/test-cli-pkg-dry-out-' + Date.now();
    execSync(
      `bun packages/cli/bin/agent-plugin package ${pluginDir} --output ${outDir} --dry-run`,
      { stdio: 'pipe' },
    );

    expect(fs.existsSync(path.join(outDir, 'test-pkg.zip'))).toBe(false);

    fs.rmSync(pluginDir, { recursive: true });
    fs.rmSync(outDir, { recursive: true, force: true });
  });
});
