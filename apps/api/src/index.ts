import dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

import cors from '@fastify/cors';
import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';

import { getEnv } from './config/env.js';
import { createServer } from './server/server.js';

getEnv();

const rawPort = String(process.env.PORT ?? '8080').trim();
const parsedPort = parseInt(rawPort, 10);
const port = Number.isInteger(parsedPort) && parsedPort >= 1 && parsedPort <= 65535 ? parsedPort : 8080;
// Railway/Docker: must bind 0.0.0.0 (or ::). localhost/127.0.0.1 = 502. Env HOST overrides.
const host = process.env.HOST?.trim() || '0.0.0.0';

console.log('ENV DEBUG', {
  DATABASE_URL: !!process.env.DATABASE_URL,
  REDIS_URL: !!process.env.REDIS_URL,
  JWT_SECRET: !!process.env.JWT_SECRET,
  PORT: process.env.PORT,
  resolvedPort: port,
});
const prisma = new PrismaClient();

async function startMinimalServer(errorMessage: string): Promise<void> {
  const app = Fastify({ logger: true });
  const corsAllowed = ['https://locus-web-seven.vercel.app', 'https://locus.app', 'http://localhost:3000'];
  const defaultOrigin = corsAllowed[0];
  const isAllowed = (o: string) => corsAllowed.includes(o) || o.endsWith('.vercel.app');
  app.addHook('onRequest', async (req, reply) => {
    if (req.method === 'OPTIONS') {
      const origin = typeof req.headers.origin === 'string' ? req.headers.origin : '';
      const allowOrigin = origin && isAllowed(origin) ? origin : defaultOrigin;
      return reply
        .code(204)
        .header('Access-Control-Allow-Origin', allowOrigin)
        .header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
        .header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, Accept')
        .header('Access-Control-Allow-Credentials', 'true')
        .header('Access-Control-Max-Age', '86400')
        .send();
    }
  });
  await app.register(cors, {
    origin: (origin: string | undefined, cb: (err: Error | null, allow: boolean) => void) => {
      if (!origin) return cb(null, true);
      if (isAllowed(origin)) return cb(null, true);
      cb(new Error('Not allowed'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
    optionsSuccessStatus: 204,
    preflight: true,
  });
  app.get('/live', async (_req, reply) => reply.code(200).send({ status: 'ok' }));
  app.get('/', async (_req, reply) => reply.code(200).send('LOCUS API running'));
  app.get('/health', async (_req, reply) => {
    return reply.code(200).send({
      status: 'ok',
      service: 'locus-api',
      mode: 'degraded',
      error: errorMessage,
      hint: 'Check Railway deploy logs. Required: DATABASE_URL, REDIS_URL, JWT_SECRET',
    });
  });
  await app.listen({ port, host });
  console.log(`API running (degraded) on ${host}:${port}`);
}

const STARTUP_TIMEOUT_MS = 18_000;

async function startFullServer(): Promise<void> {
  const server = await createServer(prisma);
  await server.listen({ port, host });
  console.log(`API running on ${host}:${port}`);
}

const start = async (): Promise<void> => {
  process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));
  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    process.exitCode = 1;
  });

  try {
    const winner = await Promise.race([
      startFullServer().then(() => 'ok' as const),
      new Promise<'timeout'>((r) => setTimeout(() => r('timeout'), STARTUP_TIMEOUT_MS)),
    ]);
    if (winner === 'timeout') {
      throw new Error('Full server init timed out');
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Server init failed:', error);
    await prisma.$disconnect().catch(() => {});
    await startMinimalServer(msg);
  }
};

void start();
