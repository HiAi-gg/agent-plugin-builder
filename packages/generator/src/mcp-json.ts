import type { PortableMcpServer } from '@agent-plugin-builder/core';
import { MCP_SCHEMA_URL } from '@agent-plugin-builder/core';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface WriteMcpJsonOptions {
  servers: PortableMcpServer[];
  outputDir: string;
}

export function writeMcpJson(options: WriteMcpJsonOptions): void {
  const { servers, outputDir } = options;

  const mcpServers: Record<string, PortableMcpServer> = {};
  servers.forEach((server, index) => {
    const name = `server-${index + 1}`;
    mcpServers[name] = server;
  });

  const mcpJson = {
    $schema: MCP_SCHEMA_URL,
    mcpServers,
  };

  const outputPath = path.join(outputDir, 'mcp.json');
  fs.writeFileSync(outputPath, JSON.stringify(mcpJson, null, 2) + '\n', 'utf-8');
}

export function generateMcpJsonContent(servers: PortableMcpServer[]): string {
  const mcpServers: Record<string, PortableMcpServer> = {};
  servers.forEach((server, index) => {
    const name = `server-${index + 1}`;
    mcpServers[name] = server;
  });

  const mcpJson = {
    $schema: MCP_SCHEMA_URL,
    mcpServers,
  };
  return JSON.stringify(mcpJson, null, 2) + '\n';
}
