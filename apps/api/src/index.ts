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

console.log('ENV DEBUG', {
  DATABASE_URL: !!process.env.DATABASE_URL,
  REDIS_URL: !!process.env.REDIS_URL,
  JWT_SECRET: !!process.env.JWT_SECRET,
  PORT: process.env.PORT,
});

const rawPort = typeof process.env.PORT === 'string' ? process.env.PORT.trim() : process.env.PORT;
const parsedPort = parseInt(String(rawPort ?? ''), 10);
const port = Number.isInteger(parsedPort) && parsedPort >= 1 && parsedPort <= 65535 ? parsedPort : 8080;
// Railway requires 0.0.0.0; localhost/127.0.0.1 causes 502 Bad Gateway
const host = '0.0.0.0';
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
