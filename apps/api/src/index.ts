import dotenv from 'dotenv';
import path from 'path';

const cwd = process.cwd();
[path.resolve(cwd, '.env'), path.resolve(cwd, '../../.env')].forEach((envPath) => {
  dotenv.config({ path: envPath, override: false });
});

import cors from '@fastify/cors';
import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';

import { getEnv } from './config/env.js';
import { createServer } from './server/server.js';

getEnv();

console.log('ENV DEBUG', {
  DATABASE_URL: !!process.env.DATABASE_URL,
  REDIS_URL: !!process.env.REDIS_URL,
  JWT_SECRET: !!process.env.JWT_SECRET,
  PORT: process.env.PORT,
});

const port = Number(process.env.PORT) || 3000;
const host = '0.0.0.0';
const prisma = new PrismaClient();

async function startMinimalServer(errorMessage: string): Promise<void> {
  const app = Fastify({ logger: true });
  await app.register(cors, {
    origin: ['http://localhost:3000', 'https://locus-web-seven.vercel.app', 'https://locus.app'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'x-user-id', 'x-user-role'],
    preflight: true,
  });
  app.get('/health', async (_req, reply) => {
    return reply.code(200).send({
      status: 'ok',
      service: 'locus-api',
      mode: 'degraded',
      error: errorMessage,
      hint: 'Check Railway deploy logs. Required: DATABASE_URL, REDIS_URL, JWT_SECRET',
    });
  });
  await app.listen({ port, host }, () => {
    console.log(`API running on 0.0.0.0:${port} (degraded mode)`);
  });
}

const start = async (): Promise<void> => {
  try {
    const server = await createServer(prisma);
    await server.listen({ port, host }, () => {
      console.log(`API running on 0.0.0.0:${port}`);
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Server init failed:', error);
    await prisma.$disconnect().catch(() => {});
    await startMinimalServer(msg);
  }
};

void start();
