import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const logLevel: ('query' | 'info' | 'warn' | 'error')[] =
  process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['warn', 'error'];

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logLevel,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export type { PrismaClient } from '@prisma/client';
