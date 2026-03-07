import { PrismaClient } from '@prisma/client';

import { createServer } from './server/server.js';

const port = Number(process.env.PORT ?? 3001);
const prisma = new PrismaClient();

const start = async (): Promise<void> => {
  try {
    const server = await createServer(prisma);
    await server.listen({ port, host: '0.0.0.0' });
  } catch (error) {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

void start();
