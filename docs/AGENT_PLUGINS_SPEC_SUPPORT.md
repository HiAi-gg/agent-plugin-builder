# Agent Plugins Specification Support

## Supported Version

Agent Plugins v1.0.0 (Working Draft)

## Schema URLs

- plugin.json: `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`
- mcp.json: `https://agent-plugins.org/schemas/1.0.0/mcp.schema.json`

## Supported Component Types

- **Skills**: `skills/*/SKILL.md` with YAML frontmatter
- **MCP Servers**: `mcp.json` with stdio, streamable-http, or sse transports

## Supported MCP Transports

- `stdio`: Local command execution
- `streamable-http`: Remote HTTP endpoint
- `sse`: Legacy HTTP+SSE (deprecated)

## Compatible Clients

- VS Code
- Cursor
- GitHub Copilot
- ChatGPT & Codex
- Kiro

## Limitations

- No support for future spec versions (v2+)
- Extensions are preserved but not validated
- No OAuth/credential management (by spec design)
