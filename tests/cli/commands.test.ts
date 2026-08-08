import { describe, test, expect, afterAll } from 'bun:test';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

// CLI tests shell out to the real binary, so they run from the repo root and
// write to a scratch directory that is removed once the suite finishes.
const projectRoot = path.resolve(import.meta.dir, '..', '..');
const tmpDir = fs.mkdtempSync(path.join('/tmp', 'agent-plugins-cli-'));

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('CLI commands', () => {
  test('init --yes creates plugin with defaults', () => {
    const outputDir = '/tmp/test-cli-init-' + Date.now();
    execSync(
      `bun packages/cli/bin/agent-plugins init --yes --name test-plugin ${outputDir}`,
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
      `bun packages/cli/bin/agent-plugins init --non-interactive --name ni-plugin ${outputDir}`,
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
      `bun packages/cli/bin/agent-plugins init --config ${configPath} ${outputDir}`,
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

  test('init --yes --dry-run previews without writing files', () => {
    const outputDir = '/tmp/test-cli-init-dry-' + Date.now();
    const result = execSync(
      `bun packages/cli/bin/agent-plugins init --yes --dry-run --name dry-plugin ${outputDir}`,
      { stdio: 'pipe', encoding: 'utf-8' },
    );

    expect(result).toContain('Dry run - would create:');
    expect(result).toContain('plugin.json');
    expect(fs.existsSync(path.join(outputDir, 'plugin.json'))).toBe(false);
    expect(fs.existsSync(outputDir)).toBe(false);
  });

  test('init --config --dry-run previews without writing files', () => {
    const configDir = '/tmp/test-cli-init-config-dry-' + Date.now();
    fs.mkdirSync(configDir, { recursive: true });
    const configPath = path.join(configDir, 'plugin.yml');
    fs.writeFileSync(
      configPath,
      `name: dry-config-plugin
version: 0.1.0
description: A dry-run config plugin
license: MIT
skills:
  - name: dry-skill
    description: A skill from config
    body: |
      # Dry Skill
readme: true
license-file: MIT
`,
      'utf-8',
    );
    const outputDir = path.join(configDir, 'out');

    const result = execSync(
      `bun packages/cli/bin/agent-plugins init --config ${configPath} ${outputDir} --dry-run`,
      { stdio: 'pipe', encoding: 'utf-8' },
    );

    expect(result).toContain('Dry run - would create:');
    expect(result).toContain('plugin.json');
    expect(fs.existsSync(path.join(outputDir, 'plugin.json'))).toBe(false);
    expect(fs.existsSync(outputDir)).toBe(false);

    fs.rmSync(configDir, { recursive: true });
  });

  test('create --skills-only creates plugin with skill', () => {
    const outputDir = '/tmp/test-cli-create-' + Date.now();
    execSync(
      `bun packages/cli/bin/agent-plugins create --name test-plugin --skills-only --output ${outputDir}`,
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
      `bun packages/cli/bin/agent-plugins create --config ${configPath} --output ${outputDir}`,
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
      `bun packages/cli/bin/agent-plugins create --name test-plugin --skill alpha --skill beta ` +
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
      `bun packages/cli/bin/agent-plugins create --name test-plugin --version 1.2.3 ` +
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

  test('create --dry-run lists files and writes nothing', () => {
    const outputDir = path.join(tmpDir, 'create-dry');
    const result = execSync(
      `bun packages/cli/bin/agent-plugins create --name test-plugin --dry-run --output ${outputDir}`,
      { encoding: 'utf-8', cwd: projectRoot, stdio: 'pipe' },
    );

    expect(result).toContain('Dry run');
    expect(result).toContain('plugin.json');
    expect(fs.existsSync(outputDir)).toBe(false);
  });

  test('create without --dry-run writes files', () => {
    const outputDir = path.join(tmpDir, 'create-real');
    execSync(
      `bun packages/cli/bin/agent-plugins create --name test-plugin --output ${outputDir}`,
      { encoding: 'utf-8', cwd: projectRoot, stdio: 'pipe' },
    );

    expect(fs.existsSync(path.join(outputDir, 'plugin.json'))).toBe(true);
    expect(
      fs.existsSync(path.join(outputDir, 'skills', 'example-skill', 'SKILL.md')),
    ).toBe(true);
  });

  test('migrate --from claude --dry-run previews without creating output dir', () => {
    const fixtureDir = path.join(tmpDir, 'fixture');
    fs.mkdirSync(fixtureDir, { recursive: true });
    fs.writeFileSync(path.join(fixtureDir, 'CLAUDE.md'), '# Instructions');

    const outputDir = path.join(tmpDir, 'migrate-dry');
    const result = execSync(
      `bun packages/cli/bin/agent-plugins migrate ${fixtureDir} --from claude --dry-run --output ${outputDir}`,
      { encoding: 'utf-8', cwd: projectRoot, stdio: 'pipe' },
    );

    expect(result).toContain('Dry run');
    expect(result).toContain('plugin.json');
    expect(fs.existsSync(outputDir)).toBe(false);
  });

  test('package creates a zip archive by default', () => {
    const pluginDir = '/tmp/test-cli-pkg-src-' + Date.now();
    execSync(
      `bun packages/cli/bin/agent-plugins create --name test-pkg --skills-only --output ${pluginDir}`,
      { stdio: 'pipe' },
    );

    const outDir = '/tmp/test-cli-pkg-out-' + Date.now();
    execSync(
      `bun packages/cli/bin/agent-plugins package ${pluginDir} --output ${outDir}`,
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
      `bun packages/cli/bin/agent-plugins create --name test-pkg --skills-only --output ${pluginDir}`,
      { stdio: 'pipe' },
    );

    const outDir = '/tmp/test-cli-pkg-tar-out-' + Date.now();
    execSync(
      `bun packages/cli/bin/agent-plugins package ${pluginDir} --output ${outDir} --format tar.gz`,
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
      `bun packages/cli/bin/agent-plugins create --name test-pkg --skills-only --output ${pluginDir}`,
      { stdio: 'pipe' },
    );

    const outDir = '/tmp/test-cli-pkg-dir-out-' + Date.now();
    execSync(
      `bun packages/cli/bin/agent-plugins package ${pluginDir} --output ${outDir} --format dir`,
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
      `bun packages/cli/bin/agent-plugins create --name test-pkg --skills-only --output ${pluginDir}`,
      { stdio: 'pipe' },
    );

    const outDir = '/tmp/test-cli-pkg-dry-out-' + Date.now();
    execSync(
      `bun packages/cli/bin/agent-plugins package ${pluginDir} --output ${outDir} --dry-run`,
      { stdio: 'pipe' },
    );

    expect(fs.existsSync(path.join(outDir, 'test-pkg.zip'))).toBe(false);

    fs.rmSync(pluginDir, { recursive: true });
    fs.rmSync(outDir, { recursive: true, force: true });
  });

  test('missing config produces clean error with exit code 1', () => {
    try {
      execSync(
        `bun packages/cli/bin/agent-plugins create --config /nonexistent.yml`,
        { encoding: 'utf-8', cwd: projectRoot, stdio: 'pipe' },
      );
      throw new Error('Should have thrown');
    } catch (err: any) {
      expect(err.status).toBe(1);
      expect(err.stderr).toContain('Config file not found');
      expect(err.stderr).not.toContain('at Object'); // No stack trace
    }
  });
});
