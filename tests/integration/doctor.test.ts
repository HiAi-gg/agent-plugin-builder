import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const projectRoot = path.resolve(__dirname, '../..');
const tmpDir = path.join('/tmp', `doctor-test-${Date.now()}`);

// Whether the external `@agent-plugins/doctor` CLI could be resolved.
// Doctor is an optional tool: when it is not available the tests log a skip
// message instead of failing.
let doctorAvailable = false;

function runDoctor(pluginDir: string, label: string) {
  if (!doctorAvailable) {
    console.log(
      `[doctor.test.ts] Doctor not available — skipping ${label} check`,
    );
    return;
  }
  try {
    // execSync throws on non-zero exit, asserting Doctor reports exit 0 for
    // the generated fixture.
    execSync(`bun x @agent-plugins/doctor ${pluginDir}`, {
      cwd: projectRoot,
      stdio: 'pipe',
    });
  } catch (err: any) {
    // If Doctor cannot be resolved at runtime (e.g. package was removed or
    // the registry is unreachable), treat it as "not available".
    if (
      err.status === 127 ||
      String(err.message ?? '').includes('not found') ||
      String(err.message ?? '').includes('404')
    ) {
      console.log(
        `[doctor.test.ts] Doctor not available — skipping ${label} check`,
      );
      return;
    }
    throw err;
  }
}

function generateFromConfig(configContent: string, name: string): string {
  const configPath = path.join(tmpDir, `${name}-config.yml`);
  fs.writeFileSync(configPath, configContent, 'utf-8');
  const pluginDir = path.join(tmpDir, name);
  execSync(
    `bun packages/cli/bin/agent-plugins create --config ${configPath} --output ${pluginDir}`,
    { cwd: projectRoot, stdio: 'pipe' },
  );
  return pluginDir;
}

describe('Builder → Doctor contract', () => {
  beforeAll(() => {
    fs.mkdirSync(tmpDir, { recursive: true });

    // Probe whether the Doctor CLI is resolvable. Doctor is an optional
    // external tool, so the suite must pass (with a skip message) when it is
    // not installed or published.
    try {
      execSync('bun x @agent-plugins/doctor --help', {
        cwd: projectRoot,
        stdio: 'pipe',
      });
      doctorAvailable = true;
    } catch {
      doctorAvailable = false;
      console.log(
        '[doctor.test.ts] @agent-plugins/doctor not available — Doctor checks will be skipped',
      );
    }
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('basic plugin passes Doctor', () => {
    // Generate plugin with only name + description flags
    const pluginDir = path.join(tmpDir, 'basic');
    execSync(
      `bun packages/cli/bin/agent-plugins create --name basic-plugin --description "A basic plugin" --output ${pluginDir}`,
      { cwd: projectRoot, stdio: 'pipe' },
    );

    expect(fs.existsSync(path.join(pluginDir, 'plugin.json'))).toBe(true);

    // Run Doctor if available
    runDoctor(pluginDir, 'basic plugin');
  });

  test('plugin with skills passes Doctor', () => {
    // Skills cover all optional skill fields: license, compatibility,
    // metadata, allowed-tools.
    const configContent = `
name: skills-plugin
version: 0.1.0
description: Plugin with skills
license: MIT
skills:
  - name: skill-one
    description: First skill
    license: MIT
    compatibility: macos
    body: |
      # Skill One
      Body text for skill one.
  - name: skill-two
    description: Second skill
    metadata:
      key: value
    allowed-tools:
      - bash
      - grep
    body: |
      # Skill Two
      Another body.
`;
    const pluginDir = generateFromConfig(configContent, 'skills-plugin');

    expect(
      fs.existsSync(path.join(pluginDir, 'skills', 'skill-one', 'SKILL.md')),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(pluginDir, 'skills', 'skill-two', 'SKILL.md')),
    ).toBe(true);

    // Run Doctor if available
    runDoctor(pluginDir, 'skills plugin');
  });

  test('plugin with MCP servers passes Doctor', () => {
    // All MCP server types: stdio, streamable-http, sse.
    const configContent = `
name: mcp-plugin
version: 0.1.0
description: Plugin with MCP servers
mcp:
  stdio-server:
    type: stdio
    command: node
    args:
      - server.js
  http-server:
    type: streamable-http
    url: https://example.com/mcp
  sse-server:
    type: sse
    url: https://example.com/sse
`;
    const pluginDir = generateFromConfig(configContent, 'mcp-plugin');

    expect(fs.existsSync(path.join(pluginDir, 'mcp.json'))).toBe(true);
    const mcpJson = JSON.parse(
      fs.readFileSync(path.join(pluginDir, 'mcp.json'), 'utf-8'),
    );
    expect(Object.keys(mcpJson.mcpServers)).toEqual([
      'stdio-server',
      'http-server',
      'sse-server',
    ]);

    // Run Doctor if available
    runDoctor(pluginDir, 'MCP plugin');
  });

  test('plugin with extensions passes Doctor', () => {
    const configContent = `
name: extensions-plugin
version: 0.1.0
description: Plugin with extensions
extensions:
  com.example:
    color: blue
    count: 3
`;
    const pluginDir = generateFromConfig(configContent, 'extensions-plugin');

    expect(
      fs.existsSync(path.join(pluginDir, 'com.example', 'extension.json')),
    ).toBe(true);

    // Run Doctor if available
    runDoctor(pluginDir, 'extensions plugin');
  });

  test('plugin with README + LICENSE passes Doctor', () => {
    const configContent = `
name: docs-plugin
version: 0.1.0
description: Plugin with README and LICENSE
license: MIT
readme: true
license-file: MIT
`;
    const pluginDir = generateFromConfig(configContent, 'docs-plugin');

    expect(fs.existsSync(path.join(pluginDir, 'README.md'))).toBe(true);
    expect(fs.existsSync(path.join(pluginDir, 'LICENSE'))).toBe(true);

    // Run Doctor if available
    runDoctor(pluginDir, 'README + LICENSE plugin');
  });
});
