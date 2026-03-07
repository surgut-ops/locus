import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  OPENAI_API_KEY: z.string().optional().default(''),
  MEILISEARCH_HOST: z.string().optional().default(''),
  R2_ENDPOINT: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_ACCESS_KEY: z.string().optional(),
  R2_SECRET_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let validated: Env | null = null;

export function getEnv(): Env {
  if (validated) {
    return validated;
  }

  const result = envSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    MEILISEARCH_HOST: process.env.MEILISEARCH_HOST,
    R2_ENDPOINT: process.env.R2_ENDPOINT ?? process.env.CLOUDFLARE_R2_ENDPOINT ?? '',
    R2_BUCKET: process.env.R2_BUCKET ?? process.env.CLOUDFLARE_R2_BUCKET ?? '',
    R2_ACCESS_KEY: process.env.R2_ACCESS_KEY ?? process.env.CLOUDFLARE_R2_KEY ?? '',
    R2_SECRET_KEY: process.env.R2_SECRET_KEY ?? process.env.CLOUDFLARE_R2_SECRET ?? '',
  });

  if (!result.success) {
    const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('\n');
    console.error('Environment validation failed:\n', errors);
    process.exit(1);
  }

  validated = result.data;
  return validated;
}
