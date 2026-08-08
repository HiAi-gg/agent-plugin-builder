import { describe, test, expect } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { generatePlugin, generateMcpJsonContent, generateSkillMd } from '@agent-plugins-builder/generator';
import type { PortablePlugin, PortableSkill } from '@agent-plugins-builder/core';

describe('generatePlugin', () => {
  test('creates plugin directory with plugin.json', () => {
    const outputDir = '/tmp/test-plugin-' + Date.now();
    const plugin: PortablePlugin = {
      metadata: { name: 'test-plugin', description: 'Test' },
      skills: [],
      mcpServers: [],
      extensions: [],
      sourceArtifacts: [],
      migrationWarnings: [],
    };

    const result = generatePlugin({ plugin, outputDir });

    expect(fs.existsSync(path.join(outputDir, 'plugin.json'))).toBe(true);
    expect(result.filesCreated.length).toBeGreaterThan(0);

    // Cleanup
    fs.rmSync(outputDir, { recursive: true });
  });

  test('creates skills directory', () => {
    const outputDir = '/tmp/test-plugin-skills-' + Date.now();
    const plugin: PortablePlugin = {
      metadata: { name: 'test-plugin', description: 'Test' },
      skills: [
        { name: 'test-skill', description: 'A test skill', body: '# Test' },
      ],
      mcpServers: [],
      extensions: [],
      sourceArtifacts: [],
      migrationWarnings: [],
    };

    generatePlugin({ plugin, outputDir });

    expect(fs.existsSync(path.join(outputDir, 'skills', 'test-skill', 'SKILL.md'))).toBe(true);

    fs.rmSync(outputDir, { recursive: true });
  });

  test('preserves MCP server _name in mcp.json', () => {
    const content = generateMcpJsonContent([
      {
        type: 'stdio',
        command: 'node',
        args: ['server.js'],
        _name: 'my-server',
      },
    ]);

    const parsed = JSON.parse(content);
    expect(Object.keys(parsed.mcpServers)).toEqual(['my-server']);
    // _name must not leak into the serialized output
    expect(parsed.mcpServers['my-server']).not.toHaveProperty('_name');
  });

  test('derives MCP server name from command when _name is absent', () => {
    const content = generateMcpJsonContent([
      { type: 'stdio', command: '/usr/local/bin/some-server' },
    ]);

    const parsed = JSON.parse(content);
    expect(Object.keys(parsed.mcpServers)).toEqual(['some-server']);
  });

  test('derives MCP server name from URL hostname when _name is absent', () => {
    const content = generateMcpJsonContent([
      { type: 'streamable-http', url: 'https://api.example.com/mcp' },
    ]);

    const parsed = JSON.parse(content);
    expect(Object.keys(parsed.mcpServers)).toEqual(['api']);
  });

  test('generateSkillMd writes valid YAML frontmatter', () => {
    const md = generateSkillMd({
      name: 'test-skill',
      description: 'A test skill',
      body: '# Body',
      allowedTools: ['shell', 'bash'],
      license: 'MIT',
      compatibility: 'agent-plugins >= 1.0.0',
    });

    const match = md.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/);
    expect(match).not.toBeNull();
    const frontmatter = match![1];
    const body = match![2];

    expect(frontmatter).toContain('name: test-skill');
    expect(frontmatter).toContain('description: A test skill');
    expect(frontmatter).toContain('allowed-tools: shell bash');
    expect(frontmatter).toContain('license: MIT');
    expect(frontmatter).toContain('compatibility: agent-plugins >= 1.0.0');
    expect(body).toBe('# Body\n');
  });

  test('generates README and LICENSE when hints are set', () => {
    const outputDir = '/tmp/test-plugin-readme-' + Date.now();
    const plugin: PortablePlugin = {
      metadata: {
        name: 'test-plugin',
        description: 'Test plugin',
        author: { name: 'Test Author' },
        license: 'MIT',
      },
      skills: [{ name: 'test-skill', description: 'A test skill', body: '# Test' }],
      mcpServers: [{ type: 'stdio', command: 'node', _name: 'my-server' }],
      extensions: [],
      sourceArtifacts: [],
      migrationWarnings: [],
      _generateReadme: true,
      _licenseType: 'MIT',
    };

    const result = generatePlugin({ plugin, outputDir });

    const readme = fs.readFileSync(path.join(outputDir, 'README.md'), 'utf-8');
    expect(readme).toContain('# test-plugin');
    expect(readme).toContain('Test plugin');
    expect(readme).toContain('test-skill');
    expect(readme).toContain('my-server');
    expect(readme).toContain('MIT');

    const license = fs.readFileSync(path.join(outputDir, 'LICENSE'), 'utf-8');
    expect(license).toContain('MIT License');
    expect(license).toContain('Copyright (c)');

    expect(result.filesCreated).toContain(path.join(outputDir, 'README.md'));
    expect(result.filesCreated).toContain(path.join(outputDir, 'LICENSE'));

    fs.rmSync(outputDir, { recursive: true });
  });
});

describe('generateSkillMd — frontmatter deduplication', () => {
  function makeSkill(overrides: Partial<PortableSkill> = {}): PortableSkill {
    return {
      name: 'test',
      description: 'Test skill',
      body: 'Body text',
      ...overrides,
    };
  }

  function parseSkillMd(md: string): { frontmatter: string; body: string } {
    const match = md.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/);
    if (!match) {
      throw new Error('Could not parse SKILL.md frontmatter');
    }
    return { frontmatter: match[1], body: match[2] };
  }

  function countOccurrences(haystack: string, needle: string): number {
    return haystack.split(needle).length - 1;
  }

  test('name + description only', () => {
    const result = generateSkillMd(makeSkill());

    expect(result).toMatch(/^---\n[\s\S]*?\n---\n\nBody text\n$/);

    // Exactly ONE frontmatter block (2 '---' lines total)
    const matches = result.match(/^---$/gm);
    expect(matches).toHaveLength(2);

    // Frontmatter parses and exposes name + description
    const { frontmatter, body } = parseSkillMd(result);
    expect(frontmatter).toContain('name: test');
    expect(frontmatter).toContain('description: Test skill');
    expect(countOccurrences(frontmatter, 'name:')).toBe(1);
    expect(countOccurrences(frontmatter, 'description:')).toBe(1);

    // Body remains unchanged
    expect(body).toBe('Body text\n');
  });

  test('license field', () => {
    const result = generateSkillMd(makeSkill({ license: 'MIT' }));

    const matches = result.match(/^---$/gm);
    expect(matches).toHaveLength(2);

    const { frontmatter, body } = parseSkillMd(result);
    expect(frontmatter).toContain('license: MIT');
    expect(countOccurrences(frontmatter, 'name:')).toBe(1);
    expect(countOccurrences(frontmatter, 'description:')).toBe(1);
    expect(countOccurrences(frontmatter, 'license:')).toBe(1);
    expect(body).toBe('Body text\n');
  });

  test('compatibility field', () => {
    const result = generateSkillMd(makeSkill({ compatibility: 'agent-plugins >= 1.0.0' }));

    const matches = result.match(/^---$/gm);
    expect(matches).toHaveLength(2);

    const { frontmatter, body } = parseSkillMd(result);
    expect(frontmatter).toContain('compatibility: agent-plugins >= 1.0.0');
    expect(countOccurrences(frontmatter, 'name:')).toBe(1);
    expect(countOccurrences(frontmatter, 'compatibility:')).toBe(1);
    expect(body).toBe('Body text\n');
  });

  test('metadata field', () => {
    const result = generateSkillMd(makeSkill({ metadata: { foo: 'bar', baz: 'qux' } }));

    const matches = result.match(/^---$/gm);
    expect(matches).toHaveLength(2);

    const { frontmatter, body } = parseSkillMd(result);
    expect(frontmatter).toContain('metadata:');
    expect(frontmatter).toContain('foo: bar');
    expect(frontmatter).toContain('baz: qux');
    expect(countOccurrences(frontmatter, 'metadata:')).toBe(1);
    expect(body).toBe('Body text\n');
  });

  test('allowed-tools field', () => {
    const result = generateSkillMd(makeSkill({ allowedTools: ['shell', 'bash'] }));

    const matches = result.match(/^---$/gm);
    expect(matches).toHaveLength(2);

    const { frontmatter, body } = parseSkillMd(result);
    expect(frontmatter).toContain('allowed-tools: shell bash');
    expect(countOccurrences(frontmatter, 'allowed-tools:')).toBe(1);
    expect(body).toBe('Body text\n');
  });

  test('all optional fields together', () => {
    const result = generateSkillMd(
      makeSkill({
        license: 'MIT',
        compatibility: 'agent-plugins >= 1.0.0',
        metadata: { foo: 'bar' },
        allowedTools: ['shell', 'bash'],
      }),
    );

    const matches = result.match(/^---$/gm);
    expect(matches).toHaveLength(2);

    const { frontmatter, body } = parseSkillMd(result);
    expect(frontmatter).toContain('name: test');
    expect(frontmatter).toContain('description: Test skill');
    expect(countOccurrences(frontmatter, 'name:')).toBe(1);
    expect(countOccurrences(frontmatter, 'description:')).toBe(1);
    expect(countOccurrences(frontmatter, 'license:')).toBe(1);
    expect(countOccurrences(frontmatter, 'compatibility:')).toBe(1);
    expect(countOccurrences(frontmatter, 'metadata:')).toBe(1);
    expect(countOccurrences(frontmatter, 'allowed-tools:')).toBe(1);
    expect(body).toBe('Body text\n');
  });

  test('body with --- frontmatter block is stripped', () => {
    const result = generateSkillMd(makeSkill({ body: '---\nname: old\n---\nBody content' }));

    // Exactly one frontmatter block (2 '---' lines total)
    const matches = result.match(/^---$/gm);
    expect(matches).toHaveLength(2);

    // The stale frontmatter keys are gone, body content survives
    expect(result).toContain('Body content');
    expect(result).not.toContain('name: old');

    const { frontmatter, body } = parseSkillMd(result);
    expect(countOccurrences(frontmatter, 'name:')).toBe(1);
    expect(countOccurrences(frontmatter, 'description:')).toBe(1);
    expect(body).toBe('Body content\n');
  });

  test('body with YAML-like text (not in --- blocks) is preserved', () => {
    const body = '# Heading\n\nname: old\nlicense: MIT\n\nBody text';
    const result = generateSkillMd(makeSkill({ body }));

    const matches = result.match(/^---$/gm);
    expect(matches).toHaveLength(2);

    // Generated frontmatter only contains the canonical keys
    const { frontmatter, body: outputBody } = parseSkillMd(result);
    expect(countOccurrences(frontmatter, 'name:')).toBe(1);
    expect(countOccurrences(frontmatter, 'description:')).toBe(1);

    // YAML-like text stays in the body, untouched
    expect(outputBody).toBe(body + '\n');
    expect(outputBody).toContain('name: old');
    expect(outputBody).toContain('license: MIT');
  });

  test('multiline description uses a YAML block scalar', () => {
    const result = generateSkillMd(makeSkill({ description: 'Line one\nLine two' }));

    const matches = result.match(/^---$/gm);
    expect(matches).toHaveLength(2);

    const { frontmatter, body } = parseSkillMd(result);
    expect(frontmatter).toContain('description: |-');
    expect(frontmatter).toContain('  Line one');
    expect(frontmatter).toContain('  Line two');
    expect(countOccurrences(frontmatter, 'description:')).toBe(1);
    expect(body).toBe('Body text\n');
  });

  test('colon in description is quoted in YAML', () => {
    const result = generateSkillMd(makeSkill({ description: 'Do: something' }));

    const matches = result.match(/^---$/gm);
    expect(matches).toHaveLength(2);

    const { frontmatter, body } = parseSkillMd(result);
    expect(frontmatter).toContain('description: "Do: something"');
    expect(countOccurrences(frontmatter, 'description:')).toBe(1);
    expect(body).toBe('Body text\n');
  });

  test('quoted values in description', () => {
    const result = generateSkillMd(makeSkill({ description: 'He said "hi"' }));

    const matches = result.match(/^---$/gm);
    expect(matches).toHaveLength(2);

    const { frontmatter, body } = parseSkillMd(result);
    expect(frontmatter).toContain('description: He said "hi"');
    expect(countOccurrences(frontmatter, 'description:')).toBe(1);
    expect(body).toBe('Body text\n');
  });

  test('unicode characters', () => {
    const result = generateSkillMd(makeSkill({ description: 'Café ☕' }));

    const matches = result.match(/^---$/gm);
    expect(matches).toHaveLength(2);

    const { frontmatter, body } = parseSkillMd(result);
    expect(frontmatter).toContain('description: Café ☕');
    expect(countOccurrences(frontmatter, 'description:')).toBe(1);
    expect(body).toBe('Body text\n');
  });

  test('code fences containing --- are preserved', () => {
    const body = '# Section\n\n```bash\necho "---"\n# --- comment\n```';
    const result = generateSkillMd(makeSkill({ body }));

    // Exactly one frontmatter block: standalone '---' lines inside fences
    // (part of quoted strings / comments) are not counted as frontmatter
    const matches = result.match(/^---$/gm);
    expect(matches).toHaveLength(2);

    // Fence content survives verbatim
    expect(result).toContain('echo "---"');
    expect(result).toContain('# --- comment');

    const { frontmatter, body: outputBody } = parseSkillMd(result);
    expect(countOccurrences(frontmatter, 'name:')).toBe(1);
    expect(countOccurrences(frontmatter, 'description:')).toBe(1);
    expect(outputBody).toBe(body + '\n');
  });

  test('markdown headings in body', () => {
    const body = '# Title\n\n## Subsection\n\nText under heading';
    const result = generateSkillMd(makeSkill({ body }));

    const matches = result.match(/^---$/gm);
    expect(matches).toHaveLength(2);

    const { frontmatter, body: outputBody } = parseSkillMd(result);
    expect(countOccurrences(frontmatter, 'name:')).toBe(1);
    expect(countOccurrences(frontmatter, 'description:')).toBe(1);
    expect(outputBody).toBe(body + '\n');
    expect(outputBody).toContain('## Subsection');
  });
});
