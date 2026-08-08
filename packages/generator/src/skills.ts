import type { PortableSkill } from '@agent-plugins-builder/core';
import YAML from 'yaml';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface WriteSkillsOptions {
  skills: PortableSkill[];
  outputDir: string;
}

export function writeSkills(options: WriteSkillsOptions): void {
  const { skills, outputDir } = options;

  const skillsDir = path.join(outputDir, 'skills');
  fs.mkdirSync(skillsDir, { recursive: true });

  for (const skill of skills) {
    const skillDir = path.join(skillsDir, skill.name);
    fs.mkdirSync(skillDir, { recursive: true });

    const skillMdPath = path.join(skillDir, 'SKILL.md');
    const content = generateSkillMd(skill);
    fs.writeFileSync(skillMdPath, content, 'utf-8');
  }
}

export function generateSkillMd(skill: PortableSkill): string {
  const frontmatter: Record<string, unknown> = {
    name: skill.name,
    description: skill.description,
  };

  if (skill.license) frontmatter.license = skill.license;
  if (skill.compatibility) frontmatter.compatibility = skill.compatibility;
  if (skill.metadata) frontmatter.metadata = skill.metadata;
  if (skill.allowedTools) frontmatter['allowed-tools'] = skill.allowedTools.join(' ');

  const yamlStr = YAML.stringify(frontmatter, {
    lineWidth: 0, // don't wrap
    defaultStringType: 'PLAIN',
    defaultKeyType: 'PLAIN',
  }).trim();

  // Strip leading frontmatter from body if present
  const body = stripLeadingFrontmatter(skill.body);

  return `---\n${yamlStr}\n---\n\n${body}\n`;
}

/**
 * Removes a leading YAML frontmatter block from a markdown body so that
 * generateSkillMd() does not emit duplicate frontmatter (e.g. when the body
 * came from a `body-file` read or a migration source that already contains it).
 *
 * Only a complete frontmatter block at the very start of the content is
 * stripped. If the content does not start with `---`, if the closing `---` is
 * missing, or if the leading `---` is merely a horizontal rule, the content is
 * returned unchanged.
 */
function stripLeadingFrontmatter(content: string): string {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith('---')) {
    return content; // No leading frontmatter
  }

  // Find closing '---' after the opening
  const lines = trimmed.split('\n');
  let closingIndex = -1;

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      closingIndex = i;
      break;
    }
  }

  if (closingIndex === -1) {
    return content; // Unclosed frontmatter, preserve as-is
  }

  // Return everything after the closing '---'
  return lines.slice(closingIndex + 1).join('\n').trimStart();
}
