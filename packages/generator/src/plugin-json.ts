import type { PluginMetadata } from '@agent-plugins-builder/core';
import { PLUGIN_SCHEMA_URL } from '@agent-plugins-builder/core';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface WritePluginJsonOptions {
  metadata: PluginMetadata;
  outputDir: string;
}

export function writePluginJson(options: WritePluginJsonOptions): void {
  const { metadata, outputDir } = options;

  const pluginJson = {
    $schema: PLUGIN_SCHEMA_URL,
    ...metadata,
  };

  const outputPath = path.join(outputDir, 'plugin.json');
  fs.writeFileSync(outputPath, JSON.stringify(pluginJson, null, 2) + '\n', 'utf-8');
}

export function generatePluginJsonContent(metadata: PluginMetadata): string {
  const pluginJson = {
    $schema: PLUGIN_SCHEMA_URL,
    ...metadata,
  };
  return JSON.stringify(pluginJson, null, 2) + '\n';
}
