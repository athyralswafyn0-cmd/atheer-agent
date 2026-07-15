import { PrismaClient } from '@prisma/client';
import { AuthService } from './modules/auth/service';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    authService: AuthService;
  }
}