import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.string().optional(),
  PORT: z.string().optional(),
  DATABASE_URL: z.string().optional().default(''),
  REDIS_URL: z.string().optional().default(''),
  JWT_SECRET: z.string().optional().default(''),
  CORS_ORIGIN: z.string().optional(),
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
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    MEILISEARCH_HOST: process.env.MEILISEARCH_HOST,
    R2_ENDPOINT: process.env.R2_ENDPOINT ?? process.env.CLOUDFLARE_R2_ENDPOINT ?? '',
    R2_BUCKET: process.env.R2_BUCKET ?? process.env.CLOUDFLARE_R2_BUCKET ?? '',
    R2_ACCESS_KEY: process.env.R2_ACCESS_KEY ?? process.env.CLOUDFLARE_R2_KEY ?? '',
    R2_SECRET_KEY: process.env.R2_SECRET_KEY ?? process.env.CLOUDFLARE_R2_SECRET ?? '',
  });

  if (!result.success) {
    console.error('Environment validation failed:', result.error.format());
  }
  validated = (result.success ? result.data : null) ?? {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL ?? '',
    REDIS_URL: process.env.REDIS_URL ?? '',
    JWT_SECRET: process.env.JWT_SECRET ?? '',
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '',
    MEILISEARCH_HOST: process.env.MEILISEARCH_HOST ?? '',
    R2_ENDPOINT: undefined,
    R2_BUCKET: undefined,
    R2_ACCESS_KEY: undefined,
    R2_SECRET_KEY: undefined,
  } as Env;
  return validated;
}
