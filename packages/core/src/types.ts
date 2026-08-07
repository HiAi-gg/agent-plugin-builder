/**
 * Canonical intermediate model for Agent Plugins.
 * Source-agnostic: all migration adapters produce this, all generators consume this.
 */

export interface PortablePlugin {
  metadata: PluginMetadata;
  instructions?: string; // AGENTS.md content
  skills: PortableSkill[];
  mcpServers: PortableMcpServer[];
  extensions: PortableExtension[];
  sourceArtifacts: SourceArtifact[];
  migrationWarnings: MigrationWarning[];
}

export interface PluginMetadata {
  name: string; // 1-64 chars, pattern: ^(?!.*(?:--|\\.\\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$
  version?: string;
  description?: string;
  author?: {
    name?: string;
    email?: string;
    url?: string;
  };
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
}

export interface PortableSkill {
  name: string; // ≤64 chars, lowercase + hyphens, must match directory name
  description: string; // ≤1024 chars
  body: string; // SKILL.md body (markdown)
  license?: string;
  compatibility?: string; // ≤500 chars
  metadata?: Record<string, string>;
  allowedTools?: string[];
  sourcePath?: string; // original file path if migrated
}

export type PortableMcpServer =
  | {
      type: 'stdio';
      command: string;
      args?: string[];
      env?: Record<string, string>;
      cwd?: string;
    }
  | {
      type: 'streamable-http';
      url: string;
      headers?: Record<string, string>;
    }
  | {
      type: 'sse';
      url: string;
      headers?: Record<string, string>;
    };

export interface PortableExtension {
  namespace: string; // reverse-domain, e.g. "com.example.client"
  data: unknown; // opaque extension data
  sourcePath?: string;
}

export interface SourceArtifact {
  path: string;
  format: string; // e.g. "claude-settings", "cursor-rules"
  classification: MigrationClassification;
  originalContent?: string;
}

export enum MigrationClassification {
  PORTABLE = 'PORTABLE',
  CLIENT_SPECIFIC = 'CLIENT_SPECIFIC',
  UNSUPPORTED = 'UNSUPPORTED',
  AMBIGUOUS = 'AMBIGUOUS',
}

export interface MigrationWarning {
  severity: 'info' | 'warning' | 'error';
  message: string;
  component?: string;
  suggestion?: string;
}
