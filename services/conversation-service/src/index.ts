import { PrismaClient } from '@prisma/client';
import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

const prisma = new PrismaClient();

async function buildApp(): Promise<FastifyInstance> {
  const app: FastifyInstance = Fastify({ logger: true });

  app.register((await import('@fastify/cors')).default, { origin: true });
  app.register((await import('@fastify/helmet')).default);
  app.register((await import('@fastify/rate-limit')).default, { max: 100 });
  app.register((await import('@fastify/jwt')).default, { secret: process.env.JWT_SECRET || 'default-secret' });

  app.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    return { status: 'ok' };
  });

  return app;
}

const appPromise = buildApp();

if (require.main === module) {
  appPromise.then(app => {
    const port = process.env.PORT || 3005;
    app.listen({ host: '0.0.0.0', port: Number(port) }, (err: Error | null, address: string) => {
      if (err) {
        app.log.error(err);
        process.exit(1);
      }
      app.log.info(`Server listening at ${address}`);
    });
  });
}

export { appPromise as app };