import { z } from 'zod';

export const MCP_SCHEMA_URL = 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json';

const stdioServerSchema = z.object({
  type: z.literal('stdio'),
  command: z.string().min(1),
  args: z.array(z.string()).optional(),
  env: z
    .record(z.string(), z.string())
    .refine(
      (env) => !Object.keys(env).includes('PLUGIN_ROOT') && !Object.keys(env).includes('PLUGIN_DATA'),
      { message: 'env must not contain PLUGIN_ROOT or PLUGIN_DATA keys' }
    )
    .optional(),
  cwd: z
    .string()
    .regex(/^(?:\.\/|\$\{PLUGIN_ROOT\}(?:\/|$)|\$\{PLUGIN_DATA\}(?:\/|$))/)
    .optional(),
}).strict();

const streamableHttpServerSchema = z.object({
  type: z.literal('streamable-http'),
  url: z.string().min(1),
  headers: z.record(z.string(), z.string()).optional(),
}).strict();

const sseServerSchema = z.object({
  type: z.literal('sse'),
  url: z.string().min(1),
  headers: z.record(z.string(), z.string()).optional(),
}).strict();

const serverSchema = z.discriminatedUnion('type', [
  stdioServerSchema,
  streamableHttpServerSchema,
  sseServerSchema,
]);

export const mcpJsonSchema = z.object({
  $schema: z.literal(MCP_SCHEMA_URL),
  mcpServers: z.record(z.string(), serverSchema),
}).strict();

export type McpJson = z.infer<typeof mcpJsonSchema>;
export type McpServer = z.infer<typeof serverSchema>;
