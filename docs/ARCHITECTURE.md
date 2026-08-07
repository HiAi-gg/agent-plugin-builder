# Architecture

## Overview

Agent Plugins Builder is a monorepo with four packages:

- **@agent-plugins-builder/core**: Types, schemas, validation
- **@agent-plugins-builder/generator**: Filesystem emission
- **@agent-plugins-builder/sources**: Migration adapters
- **@agent-plugins-builder/cli**: CLI interface

## Canonical Model

All migration adapters produce a `PortablePlugin` intermediate representation:

```typescript
interface PortablePlugin {
  metadata: PluginMetadata;
  instructions?: string;
  skills: PortableSkill[];
  mcpServers: PortableMcpServer[];
  extensions: PortableExtension[];
  sourceArtifacts: SourceArtifact[];
  migrationWarnings: MigrationWarning[];
}
```

This model is source-agnostic and generator-agnostic.

## Migration Flow

```
Source Project (Claude/Cursor/Codex/OpenCode/VS Code)
    ↓
Adapter (detect → parse → convert)
    ↓
PortablePlugin (canonical model)
    ↓
Generator (write plugin.json, mcp.json, skills/)
    ↓
Agent Plugin Directory
```

## Spec Layer

The spec layer isolates version-specific logic:

```
packages/core/src/spec/
├── v1/
│   └── index.ts (v1.0.0 constants)
├── current.ts (alias to v1)
└── index.ts
```

## Validation

All schemas use Zod for runtime validation:

- `pluginJsonSchema`: Validates plugin.json
- `mcpJsonSchema`: Validates mcp.json
- `skillFrontmatterSchema`: Validates SKILL.md frontmatter

## Path Safety

The core package enforces path containment:

- Plugin-relative paths must start with `./`
- Paths must resolve within plugin root
- Symlink escapes are rejected
