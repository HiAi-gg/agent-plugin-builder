# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| 0.1.x | ✅ Supported |

## Reporting a vulnerability

If you discover a security vulnerability, please report it privately through [GitHub Security Advisories](https://github.com/HiAi-gg/agent-plugin-builder/security/advisories/new).

Do not open a public issue for security vulnerabilities.

## What to include

When reporting, please include:

- Affected version(s)
- Steps to reproduce or a proof-of-concept
- Description of the impact
- Suggested fix if you have one

## Response

We will acknowledge receipt within 7 days and provide a timeline for a fix.

## Security considerations

Agent Plugin Builder handles untrusted input from source projects during migration. The following controls are in place:

- Migrated configuration is parsed as data, never executed.
- Suspected credentials in source projects are flagged and not copied into generated output.
- Path containment is enforced: plugin-relative paths must resolve within the plugin root.
- Symlinks that escape the plugin root are rejected.

## Scope

This policy covers the Agent Plugin Builder CLI, its packages, and generated output. It does not cover third-party agent clients or the Agent Plugins specification itself.
