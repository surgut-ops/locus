import { PrismaClient } from '@prisma/client';

import { getEnv } from './config/env.js';
import { createServer } from './server/server.js';

console.log('ENV CHECK');
console.log('PORT:', process.env.PORT);
console.log('DATABASE_URL:', !!process.env.DATABASE_URL);
console.log('REDIS_URL:', !!process.env.REDIS_URL);
console.log('JWT_SECRET:', !!process.env.JWT_SECRET);

getEnv();

const port = Number(process.env.PORT ?? 3000);
const prisma = new PrismaClient();

console.log('Binding port:', port);

const start = async (): Promise<void> => {
  try {
    const server = await createServer(prisma);
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`API running on port ${port}`);
  } catch (error) {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

void start();
