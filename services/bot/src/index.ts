import { PrismaClient } from '@prisma/client';
import { FastifyInstance } from 'fastify';

const prisma = new PrismaClient();

async function buildApp() {
  const app = Fastify({ logger: true });

  app.register(require('@fastify/cors'), { origin: true });
  app.register(require('@fastify/helmet'));
  app.register(require('@fastify/rate-limit'), { max: 100 });
  app.register(require('@fastify/jwt'), { secret: process.env.JWT_SECRET });

  app.get('/health', async (request, reply) => {
    return { status: 'ok' };
  });

  return app;
}

// Export a function that returns the app instance (for use in tests or direct call)
const app = buildApp();

// If this file is run directly, start the server
if (require.main === module) {
  app.then(app => {
    const port = process.env.PORT || 3000;
    app.listen({ host: '0.0.0.0', port }, (err, address) => {
      if (err) {
        app.log.error(err);
        process.exit(1);
      }
      app.log.info(`Server listening at ${address}`);
    });
  });
}

export { app };
