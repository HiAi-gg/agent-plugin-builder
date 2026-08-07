import type { PortableSkill } from '@agent-plugin-builder/core';
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
  if (skill.allowedTools) frontmatter['allowed-tools'] = skill.allowedTools;

  const yamlFrontmatter = Object.entries(frontmatter)
    .map(([key, value]) => {
      if (typeof value === 'string') {
        return `${key}: ${JSON.stringify(value)}`;
      }
      if (Array.isArray(value)) {
        return `${key}: ${JSON.stringify(value)}`;
      }
      if (typeof value === 'object') {
        return `${key}: ${JSON.stringify(value)}`;
      }
      return `${key}: ${value}`;
    })
    .join('\n');

  return `---\n${yamlFrontmatter}\n---\n\n${skill.body}\n`;
}
