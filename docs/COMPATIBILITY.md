# Compatibility

This document describes which Agent Plugins features and transports are supported by which clients, and what evidence level each claim has.

## Evidence levels

| Level | Meaning |
|---|---|
| Documentation verified | Confirmed in official client documentation |
| Runtime verified | Tested with a real plugin in the client |
| Expected from standard | Follows from the Agent Plugins specification requirements |
| Not verified | Not yet confirmed |

## Client support

| Client | Skills | stdio MCP | Streamable HTTP MCP | Legacy SSE MCP | Extensions | Source |
|---|---|---|---|---|---|---|
| VS Code | ✅ Docs | ✅ Docs | ✅ Docs | ✅ Docs | ✅ Docs | [VS Code docs](https://code.visualstudio.com/docs/agent-customization/agent-plugins) |
| Cursor | ✅ Docs | ✅ Docs | ✅ Docs | ✅ Docs | ✅ Docs | [Cursor docs](https://cursor.com/docs/plugins) |
| GitHub Copilot | ✅ Docs | ✅ Docs | ✅ Docs | ✅ Docs | ✅ Docs | [Copilot docs](https://docs.github.com/en/copilot/concepts/agents/about-plugins) |
| ChatGPT & Codex | ✅ Docs | ✅ Docs | ✅ Docs | ❌ Docs | ✅ Docs | [Codex docs](https://developers.openai.com/plugins) |
| Kiro | ✅ Docs | ✅ Docs | ✅ Docs | ✅ Docs | ✅ Docs | [Kiro docs](https://kiro.dev/docs/powers/) |

## Migration source support

| Source format | Detection | Skills | Instructions | MCP servers | Client-specific artifacts |
|---|---|---|---|---|---|
| Claude Code | Supported | Supported | Supported | Supported | Reported, not migrated |
| Cursor | Supported | Supported | N/A | Supported | Reported, not migrated |
| Codex | Supported | N/A | Supported | Supported (TOML) | Reported, not migrated |
| OpenCode | Supported | Supported | Supported | Supported | Reported, not migrated |
| VS Code / Copilot | Supported | Supported | Supported | Supported | Reported, not migrated |

## Specification version

This project targets [Agent Plugins v1.0.0](https://agent-plugins.org/) (Working Draft).

Last reviewed: 2026-08-07.
