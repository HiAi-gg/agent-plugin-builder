import { z } from 'zod';

export const skillFrontmatterSchema = z.object({
  name: z
    .string()
    .max(64)
    .regex(/^(?!.*--)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, {
      message: 'name must be lowercase alphanumeric with hyphens, no leading/trailing hyphen, no consecutive hyphens',
    }),
  description: z.string().min(1).max(1024),
  license: z.string().optional(),
  compatibility: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  'allowed-tools': z.union([z.string(), z.array(z.string())]).optional(),
});

export type SkillFrontmatter = z.infer<typeof skillFrontmatterSchema>;
