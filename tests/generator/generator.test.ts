import { describe, test, expect } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { generatePlugin, generateMcpJsonContent, generateSkillMd } from '@agent-plugins-builder/generator';
import type { PortablePlugin } from '@agent-plugins-builder/core';

describe('generatePlugin', () => {
  test('creates plugin directory with plugin.json', () => {
    const outputDir = '/tmp/test-plugin-' + Date.now();
    const plugin: PortablePlugin = {
      metadata: { name: 'test-plugin', description: 'Test' },
      skills: [],
      mcpServers: [],
      extensions: [],
      sourceArtifacts: [],
      migrationWarnings: [],
    };

    const result = generatePlugin({ plugin, outputDir });

    expect(fs.existsSync(path.join(outputDir, 'plugin.json'))).toBe(true);
    expect(result.filesCreated.length).toBeGreaterThan(0);

    // Cleanup
    fs.rmSync(outputDir, { recursive: true });
  });

  test('creates skills directory', () => {
    const outputDir = '/tmp/test-plugin-skills-' + Date.now();
    const plugin: PortablePlugin = {
      metadata: { name: 'test-plugin', description: 'Test' },
      skills: [
        { name: 'test-skill', description: 'A test skill', body: '# Test' },
      ],
      mcpServers: [],
      extensions: [],
      sourceArtifacts: [],
      migrationWarnings: [],
    };

    generatePlugin({ plugin, outputDir });

    expect(fs.existsSync(path.join(outputDir, 'skills', 'test-skill', 'SKILL.md'))).toBe(true);

    fs.rmSync(outputDir, { recursive: true });
  });

  test('preserves MCP server _name in mcp.json', () => {
    const content = generateMcpJsonContent([
      {
        type: 'stdio',
        command: 'node',
        args: ['server.js'],
        _name: 'my-server',
      },
    ]);

    const parsed = JSON.parse(content);
    expect(Object.keys(parsed.mcpServers)).toEqual(['my-server']);
    // _name must not leak into the serialized output
    expect(parsed.mcpServers['my-server']).not.toHaveProperty('_name');
  });

  test('derives MCP server name from command when _name is absent', () => {
    const content = generateMcpJsonContent([
      { type: 'stdio', command: '/usr/local/bin/some-server' },
    ]);

    const parsed = JSON.parse(content);
    expect(Object.keys(parsed.mcpServers)).toEqual(['some-server']);
  });

  test('derives MCP server name from URL hostname when _name is absent', () => {
    const content = generateMcpJsonContent([
      { type: 'streamable-http', url: 'https://api.example.com/mcp' },
    ]);

    const parsed = JSON.parse(content);
    expect(Object.keys(parsed.mcpServers)).toEqual(['api']);
  });

  test('generateSkillMd writes valid YAML frontmatter', () => {
    const md = generateSkillMd({
      name: 'test-skill',
      description: 'A test skill',
      body: '# Body',
      allowedTools: ['shell', 'bash'],
      license: 'MIT',
      compatibility: 'agent-plugins >= 1.0.0',
    });

    const match = md.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/);
    expect(match).not.toBeNull();
    const frontmatter = match![1];
    const body = match![2];

    expect(frontmatter).toContain('name: test-skill');
    expect(frontmatter).toContain('description: A test skill');
    expect(frontmatter).toContain('allowed-tools: shell bash');
    expect(frontmatter).toContain('license: MIT');
    expect(frontmatter).toContain('compatibility: agent-plugins >= 1.0.0');
    expect(body).toBe('# Body\n');
  });

  test('generates README and LICENSE when hints are set', () => {
    const outputDir = '/tmp/test-plugin-readme-' + Date.now();
    const plugin: PortablePlugin = {
      metadata: {
        name: 'test-plugin',
        description: 'Test plugin',
        author: { name: 'Test Author' },
        license: 'MIT',
      },
      skills: [{ name: 'test-skill', description: 'A test skill', body: '# Test' }],
      mcpServers: [{ type: 'stdio', command: 'node', _name: 'my-server' }],
      extensions: [],
      sourceArtifacts: [],
      migrationWarnings: [],
      _generateReadme: true,
      _licenseType: 'MIT',
    };

    const result = generatePlugin({ plugin, outputDir });

    const readme = fs.readFileSync(path.join(outputDir, 'README.md'), 'utf-8');
    expect(readme).toContain('# test-plugin');
    expect(readme).toContain('Test plugin');
    expect(readme).toContain('test-skill');
    expect(readme).toContain('my-server');
    expect(readme).toContain('MIT');

    const license = fs.readFileSync(path.join(outputDir, 'LICENSE'), 'utf-8');
    expect(license).toContain('MIT License');
    expect(license).toContain('Copyright (c)');

    expect(result.filesCreated).toContain(path.join(outputDir, 'README.md'));
    expect(result.filesCreated).toContain(path.join(outputDir, 'LICENSE'));

    fs.rmSync(outputDir, { recursive: true });
  });
});
