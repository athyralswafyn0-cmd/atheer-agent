import 'fastify';
import { TenantModuleInterface } from './schemas';

declare module 'fastify' {
  interface FastifyInstance {
    tenant: TenantModuleInterface;
    prisma: import('@prisma/client').PrismaClient;
  }
}