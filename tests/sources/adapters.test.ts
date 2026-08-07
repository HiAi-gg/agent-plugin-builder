import { describe, test, expect } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { detectSourceFormat, migrateSource } from '@agent-plugin-builder/sources';

describe('detectSourceFormat', () => {
  test('detects Claude project', () => {
    const testDir = '/tmp/test-claude-' + Date.now();
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(path.join(testDir, 'CLAUDE.md'), '# Instructions');

    const result = detectSourceFormat(testDir);
    expect(result.detected).toBe(true);
    expect(result.format).toBe('claude');

    fs.rmSync(testDir, { recursive: true });
  });

  test('detects Cursor project', () => {
    const testDir = '/tmp/test-cursor-' + Date.now();
    fs.mkdirSync(path.join(testDir, '.cursor'), { recursive: true });

    const result = detectSourceFormat(testDir);
    expect(result.detected).toBe(true);
    expect(result.format).toBe('cursor');

    fs.rmSync(testDir, { recursive: true });
  });
});

describe('migrateSource', () => {
  test('migrates Claude project', async () => {
    const testDir = '/tmp/test-migrate-claude-' + Date.now();
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(path.join(testDir, 'CLAUDE.md'), '# Instructions');

    const plugin = await migrateSource(testDir, 'claude');
    expect(plugin.metadata.name).toBe('migrated-plugin');
    expect(plugin.instructions).toContain('Instructions');

    fs.rmSync(testDir, { recursive: true });
  });
});
