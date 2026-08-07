import { describe, test, expect } from 'bun:test';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('CLI commands', () => {
  test('init --yes creates plugin', () => {
    const outputDir = '/tmp/test-cli-init-' + Date.now();
    execSync(`bun packages/cli/bin/agent-plugin init --yes --name test-plugin ${outputDir}`, {
      stdio: 'pipe',
    });

    expect(fs.existsSync(path.join(outputDir, 'plugin.json'))).toBe(true);

    fs.rmSync(outputDir, { recursive: true });
  });

  test('create --skills-only creates plugin with skill', () => {
    const outputDir = '/tmp/test-cli-create-' + Date.now();
    execSync(
      `bun packages/cli/bin/agent-plugin create --name test-plugin --skills-only --output ${outputDir}`,
      { stdio: 'pipe' }
    );

    expect(fs.existsSync(path.join(outputDir, 'skills'))).toBe(true);

    fs.rmSync(outputDir, { recursive: true });
  });
});
