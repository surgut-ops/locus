import { PrismaClient } from '@prisma/client';

import { getEnv } from './config/env.js';
import { createServer } from './server/server.js';

getEnv();

const port = Number(process.env.PORT ?? 3000);
const prisma = new PrismaClient();

// Railway injects PORT; must bind 0.0.0.0 for healthcheck
console.log('ENV PORT:', process.env.PORT, '| Binding port:', port);

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
