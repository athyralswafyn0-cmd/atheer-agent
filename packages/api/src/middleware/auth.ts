import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// @fastify/jwt provides jwt.sign and jwt.verify, but not an authenticate hook
// We need to add our own authenticate method that can be used as a preHandler
export const authMiddleware = (app: FastifyInstance) => {
  // Add a custom authenticate method that can be used as preHandler in routes
  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    console.log('[AUTHENTICATE] URL:', request.url);
    
    // Skip auth for public routes
    const publicPaths = [
      '/health',
      '/api/v1/auth/login',
      '/api/v1/auth/register',
      '/api/v1/auth/forgot-password',
      '/api/v1/auth/reset-password',
    ];

    const isWidgetPublic = request.url.startsWith('/widget/bots/') && 
      (request.url.includes('/conversations') || request.url.includes('/chat') || request.url.includes('/config') || request.url.includes('/leads'));
    
    const isEmbedPublic = request.url.startsWith('/embed/bots/');

    if (publicPaths.some(path => request.url.startsWith(path)) || isWidgetPublic || isEmbedPublic) {
      return;
    }

    try {
      const authHeader = request.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' });
      }

      const token = authHeader.substring(7);
      const decoded = app.jwt.verify(token) as { id: string; userId?: string; organizationId: string; role: string };
      
      // Support both 'id' and 'userId' for backward compatibility
      const userId = decoded.userId || decoded.id;
      
      const user = await app.prisma!.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, role: true, organizationMembers: { take: 1, select: { organizationId: true } } },
      });

      if (!user) {
        return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'User not found' });
      }

      const organizationId = user.organizationMembers[0]?.organizationId ?? null;
      
      request.user = {
        id: user.id,
        userId: user.id,
        organizationId,
        role: user.role,
      };
    } catch (err) {
      if ((err as any).name === 'JsonWebTokenError') {
        return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Invalid token' });
      }
      if ((err as any).name === 'TokenExpiredError') {
        return reply.code(401).send({ error: 'TOKEN_EXPIRED', message: 'Token has expired' });
      }
      return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Authentication failed' });
    }
  });

  console.log('[AUTH MIDDLEWARE] Registered - using custom authenticate hook');
};