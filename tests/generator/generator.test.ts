import { describe, test, expect } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { generatePlugin } from '@agent-plugin-builder/generator';
import type { PortablePlugin } from '@agent-plugin-builder/core';

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
});
