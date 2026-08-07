import { describe, test, expect } from 'bun:test';
import { pluginJsonSchema, mcpJsonSchema, skillFrontmatterSchema } from '@agent-plugins-builder/core';

describe('plugin.json schema', () => {
  test('validates valid plugin.json', () => {
    const valid = {
      $schema: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',
      name: 'my-plugin',
      description: 'A test plugin',
    };
    expect(pluginJsonSchema.safeParse(valid).success).toBe(true);
  });

  test('rejects invalid name', () => {
    const invalid = {
      $schema: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',
      name: 'My-Plugin', // uppercase
    };
    expect(pluginJsonSchema.safeParse(invalid).success).toBe(false);
  });

  test('rejects missing $schema', () => {
    const invalid = { name: 'test' };
    expect(pluginJsonSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('mcp.json schema', () => {
  test('validates stdio server', () => {
    const valid = {
      $schema: 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json',
      mcpServers: {
        test: { type: 'stdio', command: 'node' },
      },
    };
    expect(mcpJsonSchema.safeParse(valid).success).toBe(true);
  });

  test('rejects PLUGIN_ROOT in env', () => {
    const invalid = {
      $schema: 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json',
      mcpServers: {
        test: { type: 'stdio', command: 'node', env: { PLUGIN_ROOT: '/test' } },
      },
    };
    expect(mcpJsonSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('skill frontmatter schema', () => {
  test('validates valid skill', () => {
    const valid = {
      name: 'my-skill',
      description: 'A test skill',
    };
    expect(skillFrontmatterSchema.safeParse(valid).success).toBe(true);
  });

  test('rejects description > 1024 chars', () => {
    const invalid = {
      name: 'test',
      description: 'x'.repeat(1025),
    };
    expect(skillFrontmatterSchema.safeParse(invalid).success).toBe(false);
  });
});
