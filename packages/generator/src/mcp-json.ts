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

  const outputPath = path.join(outputDir, 'mcp.json');
  fs.writeFileSync(outputPath, generateMcpJsonContent(servers), 'utf-8');
}

export function generateMcpJsonContent(servers: PortableMcpServer[]): string {
  const mcpServers: Record<string, PortableMcpServer> = {};
  servers.forEach((server, index) => {
    // Use the server's _name if available, otherwise derive from command/url
    const name = server._name || deriveServerName(server, index);
    const { _name, ...serverData } = server;
    mcpServers[name] = serverData;
  });

  const mcpJson = {
    $schema: MCP_SCHEMA_URL,
    mcpServers,
  };
  return JSON.stringify(mcpJson, null, 2) + '\n';
}

function deriveServerName(server: PortableMcpServer, index: number): string {
  if (server.type === 'stdio') {
    // Use command as basis for name
    const cmd = server.command || '';
    const base = cmd.split('/').pop()?.split(' ').shift() || 'server';
    return sanitizeName(base);
  }
  if ('url' in server && server.url) {
    try {
      const hostname = new URL(server.url).hostname;
      return sanitizeName(hostname.split('.')[0]);
    } catch {}
  }
  return `server-${index + 1}`;
}

function sanitizeName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'server'
  );
}
