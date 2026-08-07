import { describe, test, expect } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseConfigFile, configToPortablePlugin } from '@agent-plugin-builder/core';

describe('plugin config parsing', () => {
  test('parses a valid config file', () => {
    const configPath = '/tmp/test-config-' + Date.now() + '.yml';
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
      'utf-8'
    );

    const config = parseConfigFile(configPath);
    expect(config.name).toBe('test-plugin');
    expect(config.version).toBe('0.1.0');
    expect(config.author?.name).toBe('Test Author');
    expect(config.skills?.length).toBe(1);
    expect(config.skills?.[0].name).toBe('test-skill');
    expect(config.mcp?.['my-server'].type).toBe('stdio');
    expect(config.readme).toBe(true);

    const plugin = configToPortablePlugin(config, path.dirname(configPath));
    expect(plugin.metadata.name).toBe('test-plugin');
    expect(plugin.skills[0].body).toContain('# Test Skill');
    expect(plugin.mcpServers[0]._name).toBe('my-server');
    expect(plugin._generateReadme).toBe(true);
    expect(plugin._licenseType).toBe('MIT');

    fs.rmSync(configPath);
  });

  test('rejects invalid config files', () => {
    const configPath = '/tmp/test-config-invalid-' + Date.now() + '.yml';
    fs.writeFileSync(configPath, 'name: "UPPER_CASE!"\n', 'utf-8');

    expect(() => parseConfigFile(configPath)).toThrow(/Invalid config file/);

    fs.rmSync(configPath);
  });

  test('throws when stdio MCP server is missing command', () => {
    const config = {
      name: 'test-plugin',
      mcp: {
        broken: {
          type: 'stdio',
        },
      },
    } as any;

    expect(() => configToPortablePlugin(config, '/tmp')).toThrow(
      'MCP server "broken" is stdio but missing command'
    );
  });

  test('resolves body-file relative to config directory', () => {
    const configDir = '/tmp/test-config-body-' + Date.now();
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, 'body.md'), '# From File\nBody content.\n', 'utf-8');

    const config = {
      name: 'test-plugin',
      skills: [
        {
          name: 'file-skill',
          description: 'A skill with a body file',
          'body-file': 'body.md',
        },
      ],
    } as any;

    const plugin = configToPortablePlugin(config, configDir);
    expect(plugin.skills[0].body).toBe('# From File\nBody content.\n');

    fs.rmSync(configDir, { recursive: true });
  });

  test('converts allowed-tools string to array', () => {
    const config = {
      name: 'test-plugin',
      skills: [
        {
          name: 'tool-skill',
          description: 'A skill with tools',
          body: 'body',
          'allowed-tools': 'shell bash',
        },
      ],
    } as any;

    const plugin = configToPortablePlugin(config, '/tmp');
    expect(plugin.skills[0].allowedTools).toEqual(['shell', 'bash']);
  });

  test('passes through allowed-tools array', () => {
    const config = {
      name: 'test-plugin',
      skills: [
        {
          name: 'tool-skill',
          description: 'A skill with tools',
          body: 'body',
          'allowed-tools': ['shell', 'bash'],
        },
      ],
    } as any;

    const plugin = configToPortablePlugin(config, '/tmp');
    expect(plugin.skills[0].allowedTools).toEqual(['shell', 'bash']);
  });

  test('converts extensions to PortableExtension entries', () => {
    const config = {
      name: 'test-plugin',
      extensions: {
        'com.example.client': { foo: 'bar' },
      },
    } as any;

    const plugin = configToPortablePlugin(config, '/tmp');
    expect(plugin.extensions).toEqual([
      { namespace: 'com.example.client', data: { foo: 'bar' } },
    ]);
  });
});
