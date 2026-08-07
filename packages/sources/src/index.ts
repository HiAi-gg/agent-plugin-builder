export * from './claude/index.ts';
export * from './cursor/index.ts';
export * from './codex/index.ts';
export * from './opencode/index.ts';
export * from './vscode/index.ts';

import * as fs from 'node:fs';
import * as path from 'node:path';
import { detectClaudeProject, migrateClaudeProject } from './claude/index.ts';
import { detectCursorProject, migrateCursorProject } from './cursor/index.ts';
import { detectCodexProject, migrateCodexProject } from './codex/index.ts';
import { detectOpenCodeProject, migrateOpenCodeProject } from './opencode/index.ts';
import { detectVscodeProject, migrateVscodeProject } from './vscode/index.ts';
import type { PortablePlugin } from '@agent-plugin-builder/core';

export type SourceFormat = 'claude' | 'cursor' | 'codex' | 'opencode' | 'vscode';

export interface DetectResult {
  detected: boolean;
  format?: SourceFormat;
  confidence: 'high' | 'medium' | 'low';
}

export function detectSourceFormat(rootPath: string): DetectResult {
  // Check in order of specificity
  if (detectClaudeProject(rootPath)) {
    return { detected: true, format: 'claude', confidence: 'high' };
  }

  if (detectCursorProject(rootPath)) {
    return { detected: true, format: 'cursor', confidence: 'high' };
  }

  if (detectCodexProject(rootPath)) {
    return { detected: true, format: 'codex', confidence: 'high' };
  }

  if (detectOpenCodeProject(rootPath)) {
    return { detected: true, format: 'opencode', confidence: 'high' };
  }

  if (detectVscodeProject(rootPath)) {
    return { detected: true, format: 'vscode', confidence: 'medium' };
  }

  return { detected: false, confidence: 'low' };
}

export async function migrateSource(
  rootPath: string,
  format?: SourceFormat
): Promise<PortablePlugin> {
  const detectedFormat = format || detectSourceFormat(rootPath).format;

  if (!detectedFormat) {
    throw new Error('Could not detect source format. Use --from to specify.');
  }

  switch (detectedFormat) {
    case 'claude':
      return (await migrateClaudeProject(rootPath)).plugin;
    case 'cursor':
      return (await migrateCursorProject(rootPath)).plugin;
    case 'codex':
      return (await migrateCodexProject(rootPath)).plugin;
    case 'opencode':
      return (await migrateOpenCodeProject(rootPath)).plugin;
    case 'vscode':
      return (await migrateVscodeProject(rootPath)).plugin;
    default:
      throw new Error(`Unsupported source format: ${detectedFormat}`);
  }
}