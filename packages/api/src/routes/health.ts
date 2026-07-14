import { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  // Health check endpoint
  app.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Readiness check
  app.get('/ready', async (request, reply) => {
    try {
      // Check database connection
      await app.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', timestamp: new Date().toISOString() };
    } catch (error) {
      reply.code(503);
      return { status: 'not ready', timestamp: new Date().toISOString() };
    }
  });
};

export default healthRoutes;