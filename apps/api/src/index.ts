import cors from '@fastify/cors';
import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';

import { getEnv } from './config/env.js';
import { createServer } from './server/server.js';

console.log('ENV CHECK');
console.log('PORT:', process.env.PORT);
console.log('DATABASE_URL:', !!process.env.DATABASE_URL);
console.log('REDIS_URL:', !!process.env.REDIS_URL);
console.log('JWT_SECRET:', !!process.env.JWT_SECRET);
console.log('STORAGE_BUCKET:', !!process.env.STORAGE_BUCKET);

getEnv();

const port = Number(process.env.PORT ?? 3000);
const prisma = new PrismaClient();

console.log('Binding port:', port);

async function startMinimalServer(errorMessage: string): Promise<void> {
  const app = Fastify({ logger: true });
  await app.register(cors, {
    origin: ['http://localhost:3000', 'https://locus-web-seven.vercel.app', 'https://locus.app'],
    credentials: true,
  });
  app.get('/health', async (_req, reply) => {
    return reply.code(200).send({
      status: 'degraded',
      service: 'locus-api',
      error: errorMessage,
      hint: 'Check Railway deploy logs. Required: DATABASE_URL, REDIS_URL, JWT_SECRET',
    });
  });
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`API running in degraded mode on port ${port}`);
}

const start = async (): Promise<void> => {
  try {
    const server = await createServer(prisma);
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`API running on port ${port}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Server init failed:', error);
    await prisma.$disconnect().catch(() => {});
    await startMinimalServer(msg);
  }
};

void start();
