import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

if (typeof window === 'undefined') {
  prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } }
  });
} else {
  // Prevent multiple instances in development
  // @ts-ignore
  if (!global.__db) {
    // @ts-ignore
    global.__db = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } }
    });
  }
  // @ts-ignore
  prisma = global.__db;
}

export default prisma;