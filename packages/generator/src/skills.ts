import type { PortableSkill } from '@agent-plugin-builder/core';
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

  return `---\n${yamlStr}\n---\n\n${skill.body}\n`;
}
