import type { PortableExtension } from '@agent-plugins-builder/core';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface WriteExtensionsOptions {
  extensions: PortableExtension[];
  outputDir: string;
}

export function writeExtensions(options: WriteExtensionsOptions): string[] {
  const { extensions, outputDir } = options;
  const created: string[] = [];

  for (const ext of extensions) {
    const extDir = path.join(outputDir, ext.namespace);
    fs.mkdirSync(extDir, { recursive: true });

    // Write extension data as JSON
    const dataPath = path.join(extDir, 'extension.json');
    fs.writeFileSync(dataPath, JSON.stringify(ext.data, null, 2) + '\n', 'utf-8');
    created.push(dataPath);
  }

  return created;
}
